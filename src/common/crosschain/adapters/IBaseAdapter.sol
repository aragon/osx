// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title IBaseAdapter
/// @notice Bridge-agnostic interface implemented by every cross-chain adapter.
/// @dev Adapters are invoked by the `CrossChainController` with a regular
///      `call` (never `delegatecall`), therefore adapter storage is the
///      adapter's own and the `msg.sender` seen by the bridge is the ADAPTER.
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
    /// @param _gasLimit The gas limit for cross-chain execution.
    /// @param _destinationChainId The remote chain's standard id.
    /// @param _message Encoded message.
    /// @return feeToken The token the fee is denominated in. `address(0)`
    ///         means the chain's native currency.
    /// @return fee The amount of `feeToken` required to send the message.
    function quoteFee(
        address _receiver,
        uint256 _gasLimit,
        uint256 _destinationChainId,
        bytes calldata _message
    ) external view returns (address feeToken, uint256 fee);

    /// @notice Sends a message over the bridge. Callable only by the
    ///         `CROSS_CHAIN_CONTROLLER`.
    /// @dev The controller pays the fee per send: native fees arrive as
    ///      `msg.value`, ERC20 fees are transferred to the adapter immediately
    ///      before the call. The adapter MUST NOT rely on a standing balance
    ///      and MUST return any remainder to the controller.
    /// @param _receiver The address of the adapter on a remote chain.
    /// @param _gasLimit The gas limit for cross-chain execution.
    /// @param _destinationChainId The remote chain's standard id.
    /// @param _message Encoded message.
    /// @return The bridge's message identifier.
    function sendMessage(
        address _receiver,
        uint256 _gasLimit,
        uint256 _destinationChainId,
        bytes calldata _message
    ) external payable returns (bytes32);
}
