// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBaseAdapter {
    /// @notice The address of cross chain controller that adapter stores
    ///         to send/receive messages to/from.
    function CROSS_CHAIN_CONTROLLER() external returns (address);

    /// @notice Transforms standard chain id into adapter's own custom chain Ids.
    /// @param _chainId The standard chain Id.
    /// @return The transformed chain id into adapter's custom id.
    function toNativeChainId(uint256 _chainId) external returns (uint256);

    /// @notice Transforms adapter's own custom chain Id into standard chain id.
    /// @param _chainId The custom chain id of adapter.
    /// @return The transformed chain id into standard chain id.
    function fromNativeChainId(uint256 _chainId) external returns (uint256);

    /// @param _receiver The address of the adapter on a remote chain
    /// @param _gasLimit The gas limit for cross-chain execution.
    /// @param _destinationChainId The remote chain's standard id.
    /// @param _message Encoded message.
    function sendMessage(
        address _receiver,
        uint256 _gasLimit,
        uint256 _destinationChainId,
        bytes calldata _message
    ) external returns (uint256);
}
