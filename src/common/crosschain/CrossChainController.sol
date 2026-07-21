// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IBaseAdapter} from "./adapters/IBaseAdapter.sol";
import {DaoAuthorizable} from "../permission/auth/DaoAuthorizable.sol";
import {Action, IExecutor} from "../executors/IExecutor.sol";

import {IDAO} from "../dao/IDAO.sol";
import {Errors} from "./lib/Errors.sol";

/// @title CrossChainController
/// @notice Per-DAO hub for sending and receiving cross-chain messages. It holds
///         `EXECUTE_PERMISSION` on its DAO, so every inbound path into
///         `receiveMessage` is security critical.
/// @dev Threat model / invariants:
///      - `receiveMessage` is callable ONLY by a local adapter registered
///        through `updateConfig`. The per-origin-chain authentication of the
///        remote sender is the adapter's responsibility (trusted remotes).
///      - SEND is a `delegatecall` into the local adapter. Consequences, all
///        deliberate:
///        * every send-path parameter that would otherwise be adapter storage
///          lives HERE, in `chainToAdapter`, and is passed as an argument —
///          including `bridgeChainId`, the bridge-native destination id. The
///          adapter's send path reads no storage at all, so there is no
///          storage collision to have.
///        * the bridge sees THIS CONTRACT as the message sender. The remote
///          side's trusted remote must therefore be the remote CONTROLLER,
///          while `chainToAdapter[].remoteAdapter` is the remote ADAPTER (the
///          bridge-level receiver). Two different addresses; see `ChainConfig`.
///        * this contract pays the bridge fee directly out of its own balance,
///          since it is the account executing the bridge call. There is no fee
///          hand-over and no change to return.
///      - RECEIVE is a normal call: router -> adapter -> `receiveMessage`. The
///        adapter's own storage is authoritative there.
/// @custom:security-contact sirt@aragon.org
contract CrossChainController is DaoAuthorizable {
    using SafeERC20 for IERC20;

    /// @notice Permission to forward a message to a remote chain. Held by the
    ///         DAO / the plugin whose proposals produce cross-chain actions.
    bytes32 public constant FORWARD_MESSAGE_PERMISSION_ID =
        keccak256("FORWARD_MESSAGE_PERMISSION");

    /// @notice Permission to (re)configure the chainId -> lane mapping.
    /// @dev SECURITY — READ THIS. This permission is EFFECTIVELY ROOT ON THE
    ///      DAO, and this design does not reduce that.
    ///
    ///      Because `forwardMessage` `delegatecall`s `localAdapter`, whoever
    ///      can set `localAdapter` can execute ARBITRARY CODE IN THIS
    ///      CONTRACT'S CONTEXT: it can overwrite any storage slot here
    ///      (including `chainToAdapter` and the local-adapter registry), spend
    ///      this contract's entire balance, and — since this contract holds
    ///      `EXECUTE_PERMISSION` on the DAO — make the DAO execute anything.
    ///      A single malicious `updateConfig` plus a single `forwardMessage`
    ///      is a complete DAO takeover.
    ///
    ///      This is the accepted residual risk of keeping `delegatecall`. It is
    ///      NOT mitigated by anything in this contract. Mitigation is
    ///      operational and must be treated as a hard requirement:
    ///      - grant `UPDATE_CONFIG_PERMISSION` to the DAO ITSELF ONLY, i.e.
    ///        reachable only through a passed proposal. Never to an EOA, never
    ///        to a multisig shortcut, never behind a permissionless condition.
    ///      - consider gating it further with a permission condition that
    ///        allows only an allowlist of audited adapter implementations.
    ///      - note that the blast radius is strictly larger than under a plain
    ///        `call` design, where a malicious adapter could only forge inbound
    ///        messages.
    bytes32 public constant UPDATE_CONFIG_PERMISSION_ID =
        keccak256("UPDATE_CONFIG_PERMISSION");

    /// @notice Permission to retry a message whose execution reverted on
    ///         arrival. Intended for the DAO and/or an ops multisig, since the
    ///         payload itself was already authenticated by the bridge.
    bytes32 public constant RETRY_MESSAGE_PERMISSION_ID =
        keccak256("RETRY_MESSAGE_PERMISSION");

    /// @notice Permission to move pre-funded fee assets out of this contract.
    bytes32 public constant SWEEP_PERMISSION_ID = keccak256("SWEEP_PERMISSION");

    /// @notice Everything the send path needs, held by the controller so that
    ///         the `delegatecall`ed adapter code never touches storage.
    /// @param localAdapter The adapter whose code is `delegatecall`ed to send.
    /// @param remoteAdapter The bridge-level RECEIVER on the remote chain, i.e.
    ///        the remote chain's ADAPTER address.
    /// @param bridgeChainId The bridge-native destination chain id (for CCIP,
    ///        the chain selector). Kept here rather than in an adapter mapping
    ///        precisely because mappings cannot be `immutable` and the send
    ///        path must not read storage.
    /// @dev NOTE THE ASYMMETRY. `remoteAdapter` is the remote ADAPTER, because
    ///      that is what the bridge delivers to. The remote adapter's
    ///      `trustedRemote(thisChainId)` must be THIS CONTROLLER, because under
    ///      `delegatecall` the bridge sees this controller as the sender. Do
    ///      not set the remote adapter as a trusted remote and do not set a
    ///      controller address as `remoteAdapter`. Verify with
    ///      `BaseAdapter.assertTrustedRemotesMatchControllers` and
    ///      `BaseAdapter.assertChainSelectorsMatchController` after deployment.
    struct ChainConfig {
        address localAdapter;
        address remoteAdapter;
        uint64 bridgeChainId;
    }

    /// @notice A message whose execution reverted on arrival, kept for retry.
    /// @param pending Whether a retry is still outstanding.
    /// @param originChainId The standard chain id the message came from.
    /// @param messageId The bridge-level message identifier.
    /// @param payload The encoded `Action[]`.
    struct FailedMessage {
        bool pending;
        uint256 originChainId;
        bytes32 messageId;
        bytes payload;
    }

    /// @notice Emitted when a lane is configured or cleared.
    event ConfigUpdated(
        uint256 indexed chainId,
        address localAdapter,
        address remoteAdapter,
        uint64 bridgeChainId
    );

    /// @notice Emitted when a message was handed to the local adapter.
    event MessageForwarded(
        uint256 indexed destinationChainId,
        bytes32 indexed messageId,
        address indexed localAdapter,
        address remoteAdapter,
        uint256 gasLimit,
        address feeToken,
        uint256 fee
    );

    /// @notice Emitted when an inbound message executed successfully.
    event MessageReceived(
        uint256 indexed originChainId,
        bytes32 indexed messageId,
        bytes32 indexed callId
    );

    /// @notice Emitted when an inbound message reverted and was stored.
    event MessageExecutionFailed(
        uint256 indexed originChainId,
        bytes32 indexed messageId,
        bytes32 indexed callId,
        bytes reason
    );

    /// @notice Emitted when a stored failed message was successfully retried.
    event MessageRetried(bytes32 indexed callId);

    /// @notice Emitted when fee assets are moved out of the contract.
    event Swept(address indexed token, address indexed to, uint256 amount);

    /// @notice standard chain id -> lane configuration.
    mapping(uint256 => ChainConfig) public chainToAdapter;

    /// @notice local adapter -> number of chain ids it is registered for.
    /// @dev A single adapter (e.g. one CCIP adapter) usually serves many lanes,
    ///      so a refcount is required for correct removal/rotation: the
    ///      adapter only stops being trusted once its last lane is cleared.
    mapping(address => uint256) private _localAdapterLaneCount;

    /// @notice callId -> stored failed message.
    mapping(bytes32 => FailedMessage) private _failedMessages;

    /// @notice Restricts a function to local adapters registered via `updateConfig`.
    modifier onlyLocalAdapter() {
        if (_localAdapterLaneCount[msg.sender] == 0) {
            revert Errors.CALLER_NOT_LOCAL_ADAPTER(msg.sender);
        }
        _;
    }

    constructor(address _dao) DaoAuthorizable(IDAO(_dao)) {}

    /// @notice Accepts native pre-funding used to pay bridge fees.
    receive() external payable {}

    // -------------------------------------------------------------------------
    // Configuration
    // -------------------------------------------------------------------------

    /// @notice Allows to update the lane configuration per chain.
    /// @dev Pass an all-zero `ChainConfig` to clear a lane; this also
    ///      decrements the local adapter's refcount so a rotated-out adapter
    ///      loses the right to call `receiveMessage`.
    /// @param _chainIds The standard chain ids to configure.
    /// @param _configs The lane configuration per chain id.
    function updateConfig(
        uint256[] memory _chainIds,
        ChainConfig[] memory _configs
    ) public auth(UPDATE_CONFIG_PERMISSION_ID) {
        if (_chainIds.length != _configs.length)
            revert Errors.INVALID_LENGTH_MISMATCH();

        for (uint256 i = 0; i < _chainIds.length; i++) {
            uint256 chainId = _chainIds[i];
            if (chainId == 0) revert Errors.INVALID_CHAIN_ID();

            ChainConfig memory newConfig = _configs[i];

            // A lane is either fully set or fully cleared; a half-configured
            // lane is the "silent no-op" footgun. `bridgeChainId == 0` in
            // particular would otherwise mean "send to selector 0".
            bool anySet = newConfig.localAdapter != address(0) ||
                newConfig.remoteAdapter != address(0) ||
                newConfig.bridgeChainId != 0;
            bool allSet = newConfig.localAdapter != address(0) &&
                newConfig.remoteAdapter != address(0) &&
                newConfig.bridgeChainId != 0;

            if (anySet != allSet) {
                revert Errors.INCOMPLETE_ADAPTER_CONFIG(chainId);
            }

            address oldLocalAdapter = chainToAdapter[chainId].localAdapter;

            if (oldLocalAdapter != newConfig.localAdapter) {
                if (oldLocalAdapter != address(0)) {
                    _localAdapterLaneCount[oldLocalAdapter] -= 1;
                }
                if (newConfig.localAdapter != address(0)) {
                    _localAdapterLaneCount[newConfig.localAdapter] += 1;
                }
            }

            chainToAdapter[chainId] = newConfig;

            emit ConfigUpdated(
                chainId,
                newConfig.localAdapter,
                newConfig.remoteAdapter,
                newConfig.bridgeChainId
            );
        }
    }

    /// @notice Whether an address is currently registered as a local adapter.
    /// @param _adapter The address to check.
    /// @return True if the address may call `receiveMessage`.
    function isRegisteredLocalAdapter(
        address _adapter
    ) public view returns (bool) {
        return _adapter != address(0) && _localAdapterLaneCount[_adapter] != 0;
    }

    /// @notice The number of lanes an adapter is registered for.
    /// @param _adapter The adapter address.
    /// @return The lane count.
    function localAdapterLaneCount(
        address _adapter
    ) public view returns (uint256) {
        return _localAdapterLaneCount[_adapter];
    }

    // -------------------------------------------------------------------------
    // Sending
    // -------------------------------------------------------------------------

    /// @notice Quotes the bridge fee for a prospective send.
    /// @dev Invoked as a normal `view` call on the adapter, which is safe and
    ///      equivalent to what the `delegatecall`ed send path computes only
    ///      because the adapter's quote path reads no storage either (fee token
    ///      and router are `immutable`).
    ///
    ///      Off-chain monitoring should poll this and top the contract up ahead
    ///      of a deadline: a quote taken when a proposal is created can be
    ///      badly stale by the time the voting window closes.
    /// @param _destinationChainId The standard chain id of remote chain.
    /// @param _gasLimit The gas limit that will be used for crosschain message execution.
    /// @param _message The encoded Action[] message.
    /// @return feeToken The fee token (`address(0)` for native).
    /// @return fee The required fee amount.
    /// @return available The balance this contract currently holds of `feeToken`.
    function quoteFee(
        uint256 _destinationChainId,
        uint256 _gasLimit,
        bytes memory _message
    ) public view returns (address feeToken, uint256 fee, uint256 available) {
        ChainConfig memory config = _validatedConfig(_destinationChainId);

        (feeToken, fee) = IBaseAdapter(config.localAdapter).quoteFee(
            config.remoteAdapter,
            config.bridgeChainId,
            _gasLimit,
            _message
        );

        available = feeToken == address(0)
            ? address(this).balance
            : IERC20(feeToken).balanceOf(address(this));
    }

    /// @notice Entry point to receive a message and send it to cross-chain.
    /// @dev Executes the adapter's send code IN THIS CONTRACT'S CONTEXT. The
    ///      bridge fee is paid straight from this contract's balance, and the
    ///      bridge attributes the message to this contract's address.
    /// @param _destinationChainId The standard chain id of remote chain.
    /// @param _gasLimit The gas limit that will be used for crosschain message execution.
    /// @param _message The encoded Action[] message.
    /// @return messageId The bridge-level identifier of the sent message.
    function forwardMessage(
        uint256 _destinationChainId,
        uint256 _gasLimit,
        bytes memory _message
    ) public auth(FORWARD_MESSAGE_PERMISSION_ID) returns (bytes32 messageId) {
        ChainConfig memory config = _validatedConfig(_destinationChainId);

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = config.localAdapter.delegatecall(
            abi.encodeCall(
                IBaseAdapter.sendMessage,
                (
                    config.remoteAdapter,
                    config.bridgeChainId,
                    _gasLimit,
                    _message
                )
            )
        );

        // FAIL LOUDLY. This function must never return successfully having
        // bridged nothing: the caller is a governance proposal racing an
        // on-chain deadline, and a silent no-op would let the proposal execute,
        // emit, and look healthy while the message never left the chain. Every
        // way the dispatch can fail — unset lane, codeless adapter, adapter
        // revert, insufficient fee, or a "successful" call that did not return
        // a well-formed result — reverts here.
        if (!success) {
            // Bubble the adapter's revert reason verbatim (e.g.
            // `INSUFFICIENT_FEE_BALANCE`), or fail loudly if there is none.
            if (returndata.length == 0) revert Errors.MESSAGE_SEND_FAILED();
            // solhint-disable-next-line no-inline-assembly
            assembly {
                revert(add(returndata, 32), mload(returndata))
            }
        }

        // A conforming `sendMessage` returns (bytes32, address, uint256).
        // Anything shorter did not dispatch a message.
        if (returndata.length < 96) revert Errors.MESSAGE_SEND_FAILED();

        address feeToken;
        uint256 fee;
        (messageId, feeToken, fee) = abi.decode(
            returndata,
            (bytes32, address, uint256)
        );

        emit MessageForwarded(
            _destinationChainId,
            messageId,
            config.localAdapter,
            config.remoteAdapter,
            _gasLimit,
            feeToken,
            fee
        );
    }

    // -------------------------------------------------------------------------
    // Receiving
    // -------------------------------------------------------------------------

    /// @notice The final destination for a message that arrives on remote chain.
    /// @dev Only a registered local adapter may call this. The adapter is
    ///      responsible for having authenticated the remote sender. Execution
    ///      is wrapped defensively: a reverting payload is stored and can be
    ///      retried later instead of being stranded until the bridge's manual
    ///      execution window (~8h for CCIP) closes.
    /// @param _messageId The bridge-level message identifier.
    /// @param _payload The encoded Action[] message.
    /// @param _originChainId The origin chain id from which cross-chain message originated.
    /// @return callId The deterministic call id used for the DAO execution.
    function receiveMessage(
        bytes32 _messageId,
        bytes memory _payload,
        uint256 _originChainId
    ) public onlyLocalAdapter returns (bytes32 callId) {
        callId = deriveCallId(_originChainId, _messageId);

        if (_failedMessages[callId].pending) {
            revert Errors.MESSAGE_ALREADY_PENDING(callId);
        }

        // The self-call also contains payload decoding, so a malformed payload
        // is captured for retry rather than reverting the bridge delivery.
        try this.executeActions(callId, _payload) {
            emit MessageReceived(_originChainId, _messageId, callId);
        } catch (bytes memory reason) {
            _failedMessages[callId] = FailedMessage({
                pending: true,
                originChainId: _originChainId,
                messageId: _messageId,
                payload: _payload
            });

            emit MessageExecutionFailed(
                _originChainId,
                _messageId,
                callId,
                reason
            );
        }
    }

    /// @notice Decodes and executes an authenticated payload on the DAO.
    /// @dev External only so it can be wrapped in `try/catch`; callable
    ///      exclusively by this contract.
    /// @param _callId The call id passed to the executor.
    /// @param _payload The encoded Action[] message.
    function executeActions(bytes32 _callId, bytes memory _payload) external {
        if (msg.sender != address(this)) {
            revert Errors.CALLER_NOT_SELF(msg.sender);
        }

        Action[] memory actions = abi.decode(_payload, (Action[]));

        IExecutor(address(dao())).execute(_callId, actions, 0);
    }

    /// @notice Retries a previously failed inbound message.
    /// @dev Reverts (bubbling the failure) if the retry fails again, so the
    ///      stored message stays pending.
    /// @param _callId The call id emitted by `MessageExecutionFailed`.
    function retryFailedMessage(
        bytes32 _callId
    ) public auth(RETRY_MESSAGE_PERMISSION_ID) {
        FailedMessage memory failed = _failedMessages[_callId];
        if (!failed.pending) revert Errors.NO_FAILED_MESSAGE(_callId);

        delete _failedMessages[_callId];

        this.executeActions(_callId, failed.payload);

        emit MessageRetried(_callId);
    }

    /// @notice Returns a stored failed message.
    /// @param _callId The call id.
    /// @return The stored message; `pending` is false if there is none.
    function getFailedMessage(
        bytes32 _callId
    ) public view returns (FailedMessage memory) {
        return _failedMessages[_callId];
    }

    /// @notice Derives the DAO call id / failed-message key of a message.
    /// @param _originChainId The standard origin chain id.
    /// @param _messageId The bridge-level message identifier.
    /// @return The call id.
    function deriveCallId(
        uint256 _originChainId,
        bytes32 _messageId
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(_originChainId, _messageId));
    }

    // -------------------------------------------------------------------------
    // Fee custody
    // -------------------------------------------------------------------------

    /// @notice Moves pre-funded fee assets out of this contract.
    /// @dev This contract is the fee payer: under `delegatecall` the bridge
    ///      call is made by this account, so the fee (native `msg.value` or an
    ///      ERC20 pulled by the router) comes straight from here. No funds are
    ///      ever handed to the adapter and none can be stranded there.
    /// @param _token The asset to move; `address(0)` for native currency.
    /// @param _to The recipient (typically the DAO).
    /// @param _amount The amount to move.
    function sweep(
        address _token,
        address _to,
        uint256 _amount
    ) public auth(SWEEP_PERMISSION_ID) {
        if (_to == address(0)) revert Errors.ZERO_ADDRESS();

        if (_token == address(0)) {
            // solhint-disable-next-line avoid-low-level-calls
            (bool ok, ) = _to.call{value: _amount}("");
            if (!ok) revert Errors.NATIVE_TRANSFER_FAILED(_to, _amount);
        } else {
            IERC20(_token).safeTransfer(_to, _amount);
        }

        emit Swept(_token, _to, _amount);
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    /// @notice Loads and validates the lane configuration for a destination.
    /// @dev Reverts instead of silently no-op'ing: a `delegatecall` to a
    ///      codeless address reports success, which would let a proposal
    ///      "execute" while nothing was ever bridged. A zero `bridgeChainId`
    ///      is rejected for the same reason: it would address bridge lane `0`.
    function _validatedConfig(
        uint256 _destinationChainId
    ) internal view returns (ChainConfig memory config) {
        config = chainToAdapter[_destinationChainId];

        if (
            config.localAdapter == address(0) ||
            config.remoteAdapter == address(0) ||
            config.bridgeChainId == 0
        ) {
            revert Errors.ADAPTER_NOT_CONFIGURED(_destinationChainId);
        }

        if (config.localAdapter.code.length == 0) {
            revert Errors.ADAPTER_HAS_NO_CODE(config.localAdapter);
        }
    }
}
