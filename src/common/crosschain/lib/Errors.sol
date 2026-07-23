// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

library Errors {
    // ---------------------------------------------------------------------
    // Generic / configuration
    // ---------------------------------------------------------------------

    error INVALID_LENGTH_MISMATCH();

    /// @notice Thrown when a chain id of `0` is used. `0` is reserved as the
    ///         "unset" marker of the `chainToAdapter` and chain-selector maps.
    error INVALID_CHAIN_ID();

    /// @notice Thrown when a lane is only partially configured. A lane is
    ///         either fully set (`localAdapter`, `remoteAdapter` and
    ///         `bridgeChainId` all non-zero) or fully cleared.
    error INCOMPLETE_ADAPTER_CONFIG(uint256 chainId);

    /// @notice Thrown when forwarding to a chain whose lane is unset. Covers a
    ///         missing local adapter, a missing remote adapter, and a missing
    ///         bridge-native chain id (which would otherwise send to
    ///         selector `0`).
    error ADAPTER_NOT_CONFIGURED(uint256 chainId);

    /// @notice Thrown when the configured local adapter has no deployed code.
    ///         Guards against the EVM reporting success for calls to codeless
    ///         addresses.
    error ADAPTER_HAS_NO_CODE(address adapter);

    error ZERO_ADDRESS();

    // ---------------------------------------------------------------------
    // Authorization
    // ---------------------------------------------------------------------

    error CALLER_NOT_CCIP_ROUTER();

    /// @notice Thrown when `receiveMessage` is called by anything other than a
    ///         local adapter registered through `updateConfig`.
    error CALLER_NOT_LOCAL_ADAPTER(address caller);

    /// @notice Thrown when an adapter entry point is called by anything other
    ///         than the `CrossChainController` that owns the adapter.
    error CALLER_NOT_CROSS_CHAIN_CONTROLLER(address caller);

    /// @notice Thrown when the send path is executed outside a `delegatecall`
    ///         from the owning `CrossChainController`, i.e. when
    ///         `address(this) != CROSS_CHAIN_CONTROLLER`. Calling an adapter's
    ///         `sendMessage` directly would use the adapter's own (empty)
    ///         balance and make the bridge see the adapter as the sender, which
    ///         the far side does not trust.
    error SEND_PATH_NOT_DELEGATECALLED(address context);

    /// @notice Thrown when a RECEIVE-path function — which legitimately reads
    ///         the adapter's own storage — is reached in a foreign execution
    ///         context, i.e. `address(this) != _selfAddress`.
    /// @dev Mirror of `SEND_PATH_NOT_DELEGATECALLED`. The whole Option-1
    ///      design rests on send and receive running in DIFFERENT contexts;
    ///      this hard-blocks any future path that lets send-path context reach
    ///      storage-reading receive code, which is precisely the class of bug
    ///      the `delegatecall` mechanism could otherwise reintroduce.
    error DELEGATE_CALL_FORBIDDEN(address context, address self);

    /// @notice Thrown when the internal self-call entry point is called
    ///         externally.
    error CALLER_NOT_SELF(address caller);

    // ---------------------------------------------------------------------
    // Trusted remotes
    // ---------------------------------------------------------------------

    error TRUSTED_REMOTE_NOT_SET();
    error REMOTE_NOT_TRUSTED();
    error RECEIVER_ADDRESS_ZERO();

    /// @notice Thrown by the deployment-time consistency helper when the
    ///         adapter's trusted remote does not match the expected remote
    ///         CONTROLLER address for that chain.
    error TRUSTED_REMOTE_MISMATCH(
        uint256 chainId,
        address trustedRemote,
        address expectedRemoteController
    );

    /// @notice Thrown by the deployment-time consistency helper when the
    ///         adapter's trusted remote equals the controller's configured
    ///         `remoteAdapter` for the same chain. Under `delegatecall` the
    ///         bridge sees the remote CONTROLLER as the sender, so trusting the
    ///         remote ADAPTER is the canonical misconfiguration: every inbound
    ///         message would be rejected.
    error TRUSTED_REMOTE_IS_REMOTE_ADAPTER(uint256 chainId, address remote);

    // ---------------------------------------------------------------------
    // Chain id mapping
    // ---------------------------------------------------------------------

    /// @notice Thrown when a standard chain id has no bridge-native counterpart.
    error UNKNOWN_CHAIN_ID(uint256 chainId);

    /// @notice Thrown when a bridge-native chain id has no standard counterpart.
    error UNKNOWN_NATIVE_CHAIN_ID(uint256 nativeChainId);

    /// @notice Thrown when the controller's send-side `bridgeChainId` for a
    ///         chain disagrees with the adapter's receive-side chain-id map.
    ///         The two live in different contracts by design (send config must
    ///         be storage-free) and must be kept in sync.
    error CHAIN_ID_DESYNC(
        uint256 chainId,
        uint64 controllerBridgeChainId,
        uint64 adapterBridgeChainId
    );

    // ---------------------------------------------------------------------
    // Fees
    // ---------------------------------------------------------------------

    /// @notice Thrown when the pre-funded fee balance is below the quoted fee.
    /// @dev Distinct on purpose: ops alerts on exactly this to know when the
    ///      fee-paying contract must be topped up.
    error INSUFFICIENT_FEE_BALANCE(
        address feeToken,
        uint256 required,
        uint256 available
    );

    error NOT_ENOUGH_TO_PAY_BRIDGE();

    /// @notice Thrown when the `delegatecall` into the local adapter's send
    ///         path failed without returning a reason to bubble.
    error MESSAGE_SEND_FAILED();

    /// @notice Thrown when native value is sent while an ERC20 fee token is
    ///         configured (the value would be stranded).
    error UNEXPECTED_NATIVE_VALUE();

    error NATIVE_TRANSFER_FAILED(address to, uint256 amount);

    // ---------------------------------------------------------------------
    // Defensive receive / retry
    // ---------------------------------------------------------------------

    /// @notice Thrown when retrying a call id that has no stored failed message.
    error NO_FAILED_MESSAGE(bytes32 txId);

    /// @notice Thrown when an inbound message reuses a call id that is already
    ///         stored as delivered or executed.
    error MESSAGE_ALREADY_DELIVERED_OR_EXECUTED(bytes32 txId);

    /// @notice Thrown when an inbound message reuses a call id that is already
    ///         stored as delivered or executed.
    error MESSAGE_ALREADY_EXECUTED_OR_NOT_EXISTS(bytes32 txId);

    /// @notice Thrown when message delivered to the actual chain doesn't match
    ///         the chain sender intended to send.
    error INCORRECT_CHAIN_MISMATCH();
}
