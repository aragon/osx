// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title IBaseAdapter
interface IBaseAdapter {
    /// @notice The address of cross chain controller that adapter stores
    ///         to send/receive messages to/from.
    function CROSS_CHAIN_CONTROLLER() external view returns (address);

    /// @notice Transforms standard chain id into adapter's own custom chain Ids.
    /// @param _chainId The standard chain Id.
    /// @return The transformed chain id into adapter's custom id.
    /// @dev MUST revert for unmapped chain ids instead of returning `0`.
    function toNativeChainId(uint256 _chainId) external view returns (uint256);

    /// @notice Transforms adapter's own custom chain Id into standard chain id.
    /// @param _chainId The custom chain id of adapter.
    /// @return The transformed chain id into standard chain id.
    /// @dev MUST revert for unmapped chain ids instead of returning `0`.
    function fromNativeChainId(
        uint256 _chainId
    ) external view returns (uint256);

    /// @notice Quotes the bridge fee for a given message.
    /// @param _receiver The address of the adapter on a remote chain.
    /// @param _destinationChainId The standard destination chain id; the adapter
    ///        converts it to its own native chain id internally.
    /// @param _gasLimit The gas limit for cross-chain execution.
    /// @param _message Encoded message.
    /// @return feeToken The token the fee is denominated in. `address(0)`
    ///         means the chain's native currency.
    /// @return fee The amount of `feeToken` required to send the message.
    function quoteFee(
        address _receiver,
        uint256 _destinationChainId,
        uint256 _gasLimit,
        bytes calldata _message
    ) external view returns (address feeToken, uint256 fee);

    /// @notice Sends a message over the bridge.
    /// @dev MUST be reached only by `delegatecall` from the
    ///      `CROSS_CHAIN_CONTROLLER`; implementations MUST enforce this by
    ///      checking `address(this) == CROSS_CHAIN_CONTROLLER`. The fee is paid
    ///      directly out of the CONTROLLER's balance, because under
    ///      `delegatecall` the controller is the account executing the bridge
    ///      call. No fee hand-over, and no change to return.
    /// @param _receiver The address of the adapter on a remote chain.
    /// @param _destinationChainId The standard destination chain id; the adapter
    ///        converts it to its own native chain id internally.
    /// @param _gasLimit The gas limit for cross-chain execution.
    /// @param _message Encoded message.
    /// @return messageId The bridge's message identifier.
    /// @return fee The amount actually paid, for event reporting.
    function sendMessage(
        address _receiver,
        uint256 _destinationChainId,
        uint256 _gasLimit,
        bytes calldata _message
    ) external payable returns (bytes32 messageId, uint256 fee);
}
