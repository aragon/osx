// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

/// @title ICrossChainControllerEvents
/// @custom:security-contact sirt@aragon.org
interface ICrossChainControllerEvents {
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
        bytes32 indexed txId,
        bytes transaction,
        address localAdapter,
        address remoteAdapter,
        uint256 gasLimit,
        uint256 fee
    );

    /// @notice Emitted when an inbound message executed successfully.
    event MessageReceived(
        uint256 indexed originChainId,
        bytes32 indexed messageId,
        bytes32 indexed txId,
        bytes transaction
    );

    /// @notice Emitted when an inbound message reverted and was stored.
    event MessageExecutionFailed(
        uint256 indexed originChainId,
        bytes32 indexed messageId,
        bytes32 indexed txId,
        bytes transaction,
        bytes reason
    );

    /// @notice Emitted when a stored failed message was successfully retried.
    event MessageRetried(bytes32 indexed callId);

    /// @notice Emitted when fee assets are moved out of the contract.
    event Swept(address indexed token, address indexed to, uint256 amount);
}

/// @title ICrossChainController
/// @custom:security-contact sirt@aragon.org
interface ICrossChainController is ICrossChainControllerEvents {
    /// @param localAdapter The adapter where message will be forwarded to.
    /// @param remoteAdapter The bridge-level RECEIVER on the remote chain.
    struct ChainConfig {
        address localAdapter;
        address remoteAdapter;
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
    ) external returns (bytes32 messageId);

    /// @notice The final destination for a message that arrives on remote chain.
    /// @param _messageId The bridge's own messageId for emit only.
    /// @param _encodedTx The encoded transaction object (that contains the message itself).
    /// @param _originChainId The origin chain id from which cross-chain message originated.
    /// @return txId The deterministic transaction id used for the DAO execution.
    function receiveMessage(
        bytes32 _messageId,
        bytes memory _encodedTx,
        uint256 _originChainId
    ) external returns (bytes32 txId);

    /// @notice Retries a previously failed inbound message.
    /// @param _encodedTx The encoded tx that must be retried.
    function retryMessage(bytes memory _encodedTx) external;
}
