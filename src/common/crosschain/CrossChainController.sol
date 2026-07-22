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
/// @notice The entry point for sending a message cross chain.
/// @dev Maps each standard chain id to the bridge adapter used to reach that
///      chain; the adapter, not this contract, translates the standard chain id
///      into the bridge's native one. Adapters are `delegatecall`ed, so the
///      bridge sees this controller (not the adapter) as the message sender on
///      the receiver side, and the send-side fee is paid by this controller.
/// @custom:security-contact sirt@aragon.org
contract CrossChainController is DaoAuthorizable {
    using SafeERC20 for IERC20;

    /// @notice Permission to forward a message to a remote chain.
    bytes32 public constant FORWARD_MESSAGE_PERMISSION_ID =
        keccak256("FORWARD_MESSAGE_PERMISSION");

    /// @notice Permission to (re)configure the config.
    bytes32 public constant UPDATE_CONFIG_PERMISSION_ID =
        keccak256("UPDATE_CONFIG_PERMISSION");

    /// @notice Permission to retry a message whose execution reverted on
    ///         arrival. Intended for the DAO and/or an ops multisig, since the
    ///         payload itself was already authenticated by the bridge.
    bytes32 public constant RETRY_MESSAGE_PERMISSION_ID =
        keccak256("RETRY_MESSAGE_PERMISSION");

    /// @notice Permission to move pre-funded fee assets out of this contract.
    bytes32 public constant SWEEP_PERMISSION_ID = keccak256("SWEEP_PERMISSION");

    /// @param localAdapter The adapter where message will be forwarded to.
    /// @param remoteAdapter The bridge-level RECEIVER on the remote chain.
    struct ChainConfig {
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

    /// @notice Emitted when a config is configured or cleared.
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

    /// @notice callId -> stored failed message.
    mapping(bytes32 => FailedMessage) private failedMessages;

    /// @notice Restricts a function to local adapters registered via `updateConfig`.
    modifier onlyLocalAdapter(uint256 _srcChainId) {
        if (msg.sender != chainToAdapter[_srcChainId].localAdapter) {
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

    /// @notice Allows to update configuration per chain.
    /// @dev Pass an all-zero `ChainConfig` to clear/remove
    ///      or a fully set one to configure it.
    /// @param _chainIds The standard chain ids to configure. These are the
    ///        REMOTE (destination/origin) chain ids, never this chain's own id:
    ///        each entry keys the lane used to send to, and receive from, that
    ///        remote chain.
    /// @param _configs The configuration per chain id.
    function updateConfig(
        uint256[] memory _chainIds,
        ChainConfig[] memory _configs
    ) public auth(UPDATE_CONFIG_PERMISSION_ID) {
        if (_chainIds.length != _configs.length) {
            revert Errors.INVALID_LENGTH_MISMATCH();
        }

        for (uint256 i = 0; i < _chainIds.length; i++) {
            uint256 chainId = _chainIds[i];
            if (chainId == 0) revert Errors.INVALID_CHAIN_ID();

            ChainConfig memory newConfig = _configs[i];

            bool hasLocal = newConfig.localAdapter != address(0);
            bool hasRemote = newConfig.remoteAdapter != address(0);

            if (hasLocal != hasRemote) {
                revert Errors.INCOMPLETE_ADAPTER_CONFIG(chainId);
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
    /// @param _chainId The chain id of remote chain.
    function isRegisteredLocalAdapter(
        address _adapter,
        uint256 _chainId
    ) public view returns (bool) {
        return chainToAdapter[_chainId].localAdapter == _adapter;
    }

    /// @notice Quotes the bridge fee for a send.
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
            _destinationChainId,
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

        bytes memory encodedCall = abi.encodeCall(
            IBaseAdapter.sendMessage,
            (config.remoteAdapter, _destinationChainId, _gasLimit, _message)
        );

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = config
            .localAdapter
            .delegatecall(encodedCall);

        // If failed, it means it failed on the same chain,
        // not at arrival to remote chain.
        if (!success) {
            if (returndata.length == 0) revert Errors.MESSAGE_SEND_FAILED();

            // solhint-disable-next-line no-inline-assembly
            assembly {
                revert(add(returndata, 32), mload(returndata))
            }
        }

        // Make sure adapter returns the right length parameters.
        if (returndata.length < 64) revert Errors.MESSAGE_SEND_FAILED();

        uint256 fee;
        (messageId, fee) = abi.decode(returndata, (bytes32, uint256));

        emit MessageForwarded(
            _destinationChainId,
            messageId,
            config.localAdapter,
            config.remoteAdapter,
            _gasLimit,
            fee
        );
    }

    // -------------------------------------------------------------------------
    // Receiving
    // -------------------------------------------------------------------------

    /// @notice The final destination for a message that arrives on remote chain.
    /// @dev Only a registered local adapter may call this. The adapter is
    ///      responsible for having authenticated the remote sender.
    /// @param _messageId The bridge-level message identifier.
    /// @param _payload The encoded Action[] message.
    /// @param _originChainId The origin chain id from which cross-chain message originated.
    /// @return callId The deterministic call id used for the DAO execution.
    function receiveMessage(
        bytes32 _messageId,
        bytes memory _payload,
        uint256 _originChainId
    ) public onlyLocalAdapter(_originChainId) returns (bytes32 callId) {
        callId = deriveCallId(_originChainId, _messageId);

        if (failedMessages[callId].pending) {
            revert Errors.MESSAGE_ALREADY_PENDING(callId);
        }

        // The self-call also contains payload decoding, so a malformed payload
        // is captured for retry rather than reverting the bridge delivery.
        try this.executeActions(callId, _payload) {
            emit MessageReceived(_originChainId, _messageId, callId);
        } catch (bytes memory reason) {
            failedMessages[callId] = FailedMessage({
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
        FailedMessage memory failed = failedMessages[_callId];
        if (!failed.pending) revert Errors.NO_FAILED_MESSAGE(_callId);

        delete failedMessages[_callId];

        this.executeActions(_callId, failed.payload);

        emit MessageRetried(_callId);
    }

    /// @notice Returns a stored failed message.
    /// @param _callId The call id.
    /// @return The stored message; `pending` is false if there is none.
    function getFailedMessage(
        bytes32 _callId
    ) public view returns (FailedMessage memory) {
        return failedMessages[_callId];
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
            config.remoteAdapter == address(0)
        ) {
            revert Errors.ADAPTER_NOT_CONFIGURED(_destinationChainId);
        }
    }
}
