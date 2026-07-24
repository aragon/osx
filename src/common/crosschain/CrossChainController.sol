// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IBaseAdapter} from "./adapters/IBaseAdapter.sol";
import {ICrossChainController} from "./ICrossChainController.sol";
import {DaoAuthorizable} from "../permission/auth/DaoAuthorizable.sol";
import {Action, IExecutor} from "../executors/IExecutor.sol";

import {IDAO} from "../dao/IDAO.sol";
import {Errors} from "./lib/Errors.sol";

import {
    TransactionLib,
    Transaction,
    TransactionState
} from "./lib/Transaction.sol";

/// @title CrossChainController
/// @notice The entry point for sending a message cross chain.
/// @dev Maps each standard chain id to the bridge adapter used to reach that
///      chain; the adapter, not this contract, translates the standard chain id
///      into the bridge's native one. Adapters are `delegatecall`ed, so the
///      bridge sees this controller (not the adapter) as the message sender on
///      the receiver side, and the send-side fee is paid by this controller.
/// @custom:security-contact sirt@aragon.org
contract CrossChainController is ICrossChainController, DaoAuthorizable {
    using SafeERC20 for IERC20;
    using TransactionLib for Transaction;
    using TransactionLib for bytes;

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

    // every message originator sends we put into an transaction and attach a nonce. It increments by one
    uint256 internal _currentTxNonce;

    /// @notice txId -> stored message.
    mapping(bytes32 => TransactionState) private _transactionState;

    /// @notice standard chain id -> lane configuration.
    mapping(uint256 => ChainConfig) public chainToAdapter;

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
    ) public virtual auth(UPDATE_CONFIG_PERMISSION_ID) {
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
    )
        public
        view
        virtual
        returns (address feeToken, uint256 fee, uint256 available)
    {
        ChainConfig memory config = _validatedConfig(_destinationChainId);

        // Quote the SAME bytes `forwardMessage` will send.
        bytes memory encodedTx = Transaction({
            nonce: _currentTxNonce,
            origin: msg.sender,
            controller: address(this),
            originChainId: block.chainid,
            destinationChainId: _destinationChainId,
            message: _message
        }).encode();

        (feeToken, fee) = IBaseAdapter(config.localAdapter).quoteFee(
            config.remoteAdapter,
            _destinationChainId,
            _gasLimit,
            encodedTx
        );

        available = feeToken == address(0)
            ? address(this).balance
            : IERC20(feeToken).balanceOf(address(this));
    }

    /// @inheritdoc ICrossChainController
    /// @dev Executes the adapter's send code IN THIS CONTRACT'S CONTEXT. The
    ///      bridge fee is paid straight from this contract's balance, and the
    ///      bridge attributes the message to this contract's address.
    function forwardMessage(
        uint256 _destinationChainId,
        uint256 _gasLimit,
        bytes memory _message
    )
        public
        virtual
        override
        auth(FORWARD_MESSAGE_PERMISSION_ID)
        returns (bytes32)
    {
        ChainConfig memory config = _validatedConfig(_destinationChainId);

        bytes memory encodedTx = Transaction({
            nonce: ++_currentTxNonce,
            origin: msg.sender,
            controller: address(this),
            originChainId: block.chainid,
            destinationChainId: _destinationChainId,
            message: _message
        }).encode();

        (bytes32 messageId, uint256 fee) = _dispatch(
            config,
            _destinationChainId,
            _gasLimit,
            encodedTx
        );

        emit MessageForwarded(
            _destinationChainId,
            messageId,
            encodedTx.id(),
            encodedTx,
            config.localAdapter,
            config.remoteAdapter,
            _gasLimit,
            fee
        );

        return encodedTx.id();
    }

    // -------------------------------------------------------------------------
    // Receiving
    // -------------------------------------------------------------------------

    /// @inheritdoc ICrossChainController
    /// @dev Only a registered local adapter may call this. The adapter is
    ///      responsible for having authenticated the remote sender.
    ///      CrossChainController is bridge agnostic, so _messageId is only used
    ///      for emit principles only and should not be fully trusted.
    function receiveMessage(
        bytes32 _messageId,
        bytes memory _encodedTx,
        uint256 _originChainId
    )
        public
        virtual
        override
        onlyLocalAdapter(_originChainId)
        returns (bytes32 txId)
    {
        // Decode tx and get its id.
        Transaction memory transaction = _encodedTx.decode();
        txId = transaction.id();

        // Don't fully trust the adapter/bridge.
        if (
            transaction.originChainId != _originChainId ||
            transaction.destinationChainId != block.chainid
        ) {
            revert Errors.INCORRECT_CHAIN_MISMATCH();
        }

        // Either message is already delivered or executed.
        // If delivered, but execution failed, call retry.
        if (_transactionState[txId] != TransactionState.None) {
            revert Errors.MESSAGE_ALREADY_DELIVERED_OR_EXECUTED(txId);
        }

        // The self-call also contains payload decoding, so a malformed payload
        // is captured for retry rather than reverting the bridge delivery.
        try this.executeActions(txId, transaction.message) {
            _transactionState[txId] = TransactionState.Executed;
            emit MessageReceived(_originChainId, _messageId, txId, _encodedTx);
        } catch (bytes memory reason) {
            _transactionState[txId] = TransactionState.Delivered;

            emit MessageExecutionFailed(
                _originChainId,
                _messageId,
                txId,
                _encodedTx,
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

    /// @inheritdoc ICrossChainController
    /// @dev Reverts (bubbling the failure) if the retry fails again, so the
    ///      stored message stays pending.
    function retryMessage(
        bytes memory _encodedTx
    ) public virtual override auth(RETRY_MESSAGE_PERMISSION_ID) {
        bytes32 txId = _encodedTx.id();

        if (_transactionState[txId] != TransactionState.Delivered) {
            revert Errors.MESSAGE_ALREADY_EXECUTED_OR_NOT_EXISTS(txId);
        }

        _transactionState[txId] = TransactionState.Executed;

        this.executeActions(txId, _encodedTx.decode().message);

        emit MessageRetried(txId);
    }

    /// @notice Returns a state of transaction.
    /// @param _txId The tx id.
    /// @return The state of the transaction(None, Delivered, Executed)
    function getTransactionState(
        bytes32 _txId
    ) public view virtual returns (TransactionState) {
        return _transactionState[_txId];
    }

    /// @notice Returns a state of transaction.
    /// @param _tx The transaction.
    /// @return The state of the transaction(None, Delivered, Executed)
    function getTransactionState(
        Transaction memory _tx
    ) public view virtual returns (TransactionState) {
        return _transactionState[_tx.id()];
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
    ) public virtual auth(SWEEP_PERMISSION_ID) {
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

    /// @notice `delegatecall`s the local adapter's send path and
    ///         decodes its `(messageId, fee)` return.
    function _dispatch(
        ChainConfig memory _config,
        uint256 _destinationChainId,
        uint256 _gasLimit,
        bytes memory _encodedTx
    ) internal virtual returns (bytes32 messageId, uint256 fee) {
        bytes memory encodedCall = abi.encodeCall(
            IBaseAdapter.sendMessage,
            (_config.remoteAdapter, _destinationChainId, _gasLimit, _encodedTx)
        );

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = _config
            .localAdapter
            .delegatecall(encodedCall);

        if (!success) {
            if (returndata.length == 0) revert Errors.MESSAGE_SEND_FAILED();

            // solhint-disable-next-line no-inline-assembly
            assembly {
                revert(add(returndata, 32), mload(returndata))
            }
        }

        // Make sure adapter returns the right length parameters.
        if (returndata.length < 64) revert Errors.MESSAGE_SEND_FAILED();

        (messageId, fee) = abi.decode(returndata, (bytes32, uint256));
    }

    /// @notice Loads and validates the lane configuration for a destination.
    /// @dev Reverts instead of silently no-op'ing: a `delegatecall` to a
    ///      codeless address reports success, which would let a proposal
    ///      "execute" while nothing was ever bridged.
    function _validatedConfig(
        uint256 _destinationChainId
    ) internal view virtual returns (ChainConfig memory config) {
        config = chainToAdapter[_destinationChainId];

        if (
            config.localAdapter == address(0) ||
            config.remoteAdapter == address(0)
        ) {
            revert Errors.ADAPTER_NOT_CONFIGURED(_destinationChainId);
        }
    }
}
