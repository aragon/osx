// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title IBaseAdapter
/// @notice Bridge-agnostic interface implemented by every cross-chain adapter.
/// @dev  ADAPTERS ARE `delegatecall`ED FOR SENDING AND `call`ED FOR RECEIVING.
///
///       Send path (`sendMessage`, and by extension `quoteFee`):
///       - executed with `delegatecall` from the `CrossChainController`, so
///         `address(this)` is the CONTROLLER and any storage access would land
///         in the controller's slots. Implementations therefore MUST NOT read
///         or write ANY storage on the send path: every send-time parameter is
///         either an `immutable` (which lives in the adapter's bytecode and so
///         resolves correctly under `delegatecall`) or an explicit argument
///         supplied by the controller, including the bridge-native destination
///         chain id.
///       - because the controller executes the adapter's code, the address the
///         bridge sees as the message sender is the CONTROLLER, not the
///         adapter. See the trusted-remote note below.
///
///       Receive path (`ccipReceive` & friends):
///       - a NORMAL call from the bridge router into the adapter, so the
///         adapter's own storage applies and mutable, permissioned
///         configuration (trusted remotes, chain-id maps) is legitimate there.
///
///       TRUSTED REMOTES HOLD THE REMOTE **CONTROLLER**, NOT THE REMOTE
///       ADAPTER. Two different kinds of address appear in configuration:
///       - `CrossChainController.chainToAdapter[chainId].remoteAdapter` is the
///         bridge-level RECEIVER on the far side, i.e. the remote ADAPTER;
///       - `trustedRemote(chainId)` on the receiving adapter is the address
///         allowed to have ORIGINATED the message, i.e. the remote CONTROLLER.
///       Confusing the two is the single easiest way to misconfigure this
///       system. Use `BaseAdapter.assertTrustedRemotesMatchControllers` at
///       deployment time.
interface IBaseAdapter {
    /// @notice The address of cross chain controller that adapter stores
    ///         to send/receive messages to/from.
    function CROSS_CHAIN_CONTROLLER() external view returns (address);

    /// @notice Transforms standard chain id into adapter's own custom chain Ids.
    /// @param _chainId The standard chain Id.
    /// @return The transformed chain id into adapter's custom id.
    /// @dev MUST revert for unmapped chain ids instead of returning `0`.
    ///      NOT used on the send path (the controller supplies the
    ///      bridge-native id as an argument); kept for operations and for the
    ///      `assertChainSelectorsMatchController` consistency check.
    function toNativeChainId(uint256 _chainId) external view returns (uint256);

    /// @notice Transforms adapter's own custom chain Id into standard chain id.
    /// @param _chainId The custom chain id of adapter.
    /// @return The transformed chain id into standard chain id.
    /// @dev MUST revert for unmapped chain ids instead of returning `0`.
    function fromNativeChainId(
        uint256 _chainId
    ) external view returns (uint256);

    /// @notice Quotes the bridge fee for a given message.
    /// @dev MUST be context independent: it is invoked as a normal `view` call
    ///      by the controller but must return the same answer as the
    ///      `delegatecall`ed send path would use, which is only true if it
    ///      reads no storage.
    /// @param _receiver The address of the adapter on a remote chain.
    /// @param _bridgeChainId The bridge-native destination chain id.
    /// @param _gasLimit The gas limit for cross-chain execution.
    /// @param _message Encoded message.
    /// @return feeToken The token the fee is denominated in. `address(0)`
    ///         means the chain's native currency.
    /// @return fee The amount of `feeToken` required to send the message.
    function quoteFee(
        address _receiver,
        uint64 _bridgeChainId,
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
    /// @param _bridgeChainId The bridge-native destination chain id.
    /// @param _gasLimit The gas limit for cross-chain execution.
    /// @param _message Encoded message.
    /// @return messageId The bridge's message identifier.
    /// @return feeToken The token the fee was paid in (`address(0)` native).
    /// @return fee The amount actually paid, for event reporting.
    function sendMessage(
        address _receiver,
        uint64 _bridgeChainId,
        uint256 _gasLimit,
        bytes calldata _message
    )
        external
        payable
        returns (bytes32 messageId, address feeToken, uint256 fee);
}
