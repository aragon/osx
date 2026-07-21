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
///      - Adapters are invoked with a plain `call`, never `delegatecall`.
///        Adapter storage therefore belongs to the adapter, and the address the
///        bridge sees as the sender is the ADAPTER (see `IBaseAdapter`).
///      - This contract custodies the bridge fee funds (native and/or ERC20)
///        and forwards exactly the quoted fee to the adapter per send. Only the
///        sending side needs funding; receive-only deployments do not.
/// @custom:security-contact sirt@aragon.org
contract CrossChainController is DaoAuthorizable {
    using SafeERC20 for IERC20;

    /// @notice Permission to forward a message to a remote chain. Held by the
    ///         DAO / the plugin whose proposals produce cross-chain actions.
    bytes32 public constant FORWARD_MESSAGE_PERMISSION_ID =
        keccak256("FORWARD_MESSAGE_PERMISSION");

    /// @notice Permission to (re)configure the chainId -> adapters mapping.
    /// @dev SECURITY: this permission is highly privileged. A holder can point
    ///      a chain at an adapter it controls and, because that adapter becomes
    ///      a registered local adapter, deliver arbitrary `Action[]` payloads
    ///      into `receiveMessage` and thus execute anything on the DAO. It
    ///      MUST be granted only to the DAO itself (i.e. only reachable through
    ///      a passed proposal) and never to an EOA or a permissionless
    ///      condition. Since adapters are called (not `delegatecall`ed), a
    ///      malicious adapter cannot corrupt this contract's storage or spend
    ///      more than the fee it is handed, but it CAN forge inbound messages.
    bytes32 public constant UPDATE_CONFIG_PERMISSION_ID =
        keccak256("UPDATE_CONFIG_PERMISSION");

    /// @notice Permission to retry a message whose execution reverted on
    ///         arrival. Intended for the DAO and/or an ops multisig, since the
    ///         payload itself was already authenticated by the bridge.
    bytes32 public constant RETRY_MESSAGE_PERMISSION_ID =
        keccak256("RETRY_MESSAGE_PERMISSION");

    /// @notice Permission to move pre-funded fee assets out of this contract.
    bytes32 public constant SWEEP_PERMISSION_ID = keccak256("SWEEP_PERMISSION");

    /// @param localAdapter The address of adapter where cross chain controller will send a message on the same chain.
    /// @param remoteAdapter The address of adapter on remote chain that will receive the message.
    /// @dev `remoteAdapter` is BOTH the bridge-level receiver of outbound
    ///      messages AND the address the remote adapter must have configured as
    ///      its trusted remote for this chain (because the sender seen on the
    ///      far side is this chain's adapter). Use
    ///      `BaseAdapter.assertTrustedRemotesMatchController` after deployment
    ///      to check the two sides agree.
    struct AdapterByChain {
        address localAdapter;
        address remoteAdapter;
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
        address remoteAdapter
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

    /// @notice standard chain id -> adapter pair.
    mapping(uint256 => AdapterByChain) public chainToAdapter;

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

    /// @notice Allows to update adapters per each chain.
    /// @dev Pass the zero pair (`address(0)`, `address(0)`) to clear a lane;
    ///      this also decrements the local adapter's refcount so a rotated-out
    ///      adapter loses the right to call `receiveMessage`.
    /// @param _chainIds The standard chain ids to configure.
    /// @param _adapters The adapter pair per chain id.
    function updateConfig(
        uint256[] memory _chainIds,
        AdapterByChain[] memory _adapters
    ) public auth(UPDATE_CONFIG_PERMISSION_ID) {
        if (_chainIds.length != _adapters.length)
            revert Errors.INVALID_LENGTH_MISMATCH();

        for (uint256 i = 0; i < _chainIds.length; i++) {
            uint256 chainId = _chainIds[i];
            if (chainId == 0) revert Errors.INVALID_CHAIN_ID();

            AdapterByChain memory newConfig = _adapters[i];

            // A lane is either fully set or fully cleared; a half-configured
            // lane is the "silent no-op" footgun.
            if (
                (newConfig.localAdapter == address(0)) !=
                (newConfig.remoteAdapter == address(0))
            ) {
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
                newConfig.remoteAdapter
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
    /// @dev Off-chain monitoring should poll this and top the contract up ahead
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
        AdapterByChain memory adapters = _validatedAdapters(
            _destinationChainId
        );

        (feeToken, fee) = IBaseAdapter(adapters.localAdapter).quoteFee(
            adapters.remoteAdapter,
            _gasLimit,
            _destinationChainId,
            _message
        );

        available = feeToken == address(0)
            ? address(this).balance
            : IERC20(feeToken).balanceOf(address(this));
    }

    /// @notice Entry point to receive a message and send it to cross-chain.
    /// @param _destinationChainId The standard chain id of remote chain.
    /// @param _gasLimit The gas limit that will be used for crosschain message execution.
    /// @param _message The encoded Action[] message.
    /// @return messageId The bridge-level identifier of the sent message.
    function forwardMessage(
        uint256 _destinationChainId,
        uint256 _gasLimit,
        bytes memory _message
    ) public auth(FORWARD_MESSAGE_PERMISSION_ID) returns (bytes32 messageId) {
        AdapterByChain memory adapters = _validatedAdapters(
            _destinationChainId
        );

        (address feeToken, uint256 fee) = IBaseAdapter(adapters.localAdapter)
            .quoteFee(
                adapters.remoteAdapter,
                _gasLimit,
                _destinationChainId,
                _message
            );

        uint256 nativeValue;

        if (feeToken == address(0)) {
            if (address(this).balance < fee) {
                revert Errors.INSUFFICIENT_FEE_BALANCE(
                    feeToken,
                    fee,
                    address(this).balance
                );
            }
            nativeValue = fee;
        } else {
            uint256 balance = IERC20(feeToken).balanceOf(address(this));
            if (balance < fee) {
                revert Errors.INSUFFICIENT_FEE_BALANCE(feeToken, fee, balance);
            }
            // Hand the adapter exactly the quoted fee for this send; the
            // adapter returns any remainder in the same transaction.
            if (fee != 0) {
                IERC20(feeToken).safeTransfer(adapters.localAdapter, fee);
            }
        }

        messageId = IBaseAdapter(adapters.localAdapter).sendMessage{
            value: nativeValue
        }(adapters.remoteAdapter, _gasLimit, _destinationChainId, _message);

        emit MessageForwarded(
            _destinationChainId,
            messageId,
            adapters.localAdapter,
            adapters.remoteAdapter,
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

    /// @notice Loads and validates the adapter pair for a destination chain.
    /// @dev Reverts instead of silently no-op'ing: a `call`/`delegatecall` to a
    ///      codeless address reports success, which would let a proposal
    ///      "execute" while nothing was ever bridged.
    function _validatedAdapters(
        uint256 _destinationChainId
    ) internal view returns (AdapterByChain memory adapters) {
        adapters = chainToAdapter[_destinationChainId];

        if (
            adapters.localAdapter == address(0) ||
            adapters.remoteAdapter == address(0)
        ) {
            revert Errors.ADAPTER_NOT_CONFIGURED(_destinationChainId);
        }

        if (adapters.localAdapter.code.length == 0) {
            revert Errors.ADAPTER_HAS_NO_CODE(adapters.localAdapter);
        }
    }
}
