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

    /// @notice Thrown when only one of `localAdapter`/`remoteAdapter` is set.
    ///         A lane is either fully configured or fully cleared.
    error INCOMPLETE_ADAPTER_CONFIG(uint256 chainId);

    /// @notice Thrown when forwarding to a chain that has no adapter pair set.
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
    ///         adapter's trusted remote does not match the controller's
    ///         configured `remoteAdapter` for the same chain.
    error TRUSTED_REMOTE_MISMATCH(
        uint256 chainId,
        address trustedRemote,
        address configuredRemoteAdapter
    );

    // ---------------------------------------------------------------------
    // Chain id mapping
    // ---------------------------------------------------------------------

    /// @notice Thrown when a standard chain id has no bridge-native counterpart.
    error UNKNOWN_CHAIN_ID(uint256 chainId);

    /// @notice Thrown when a bridge-native chain id has no standard counterpart.
    error UNKNOWN_NATIVE_CHAIN_ID(uint256 nativeChainId);

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

    /// @notice Thrown when native value is sent while an ERC20 fee token is
    ///         configured (the value would be stranded).
    error UNEXPECTED_NATIVE_VALUE();

    error NATIVE_TRANSFER_FAILED(address to, uint256 amount);

    // ---------------------------------------------------------------------
    // Defensive receive / retry
    // ---------------------------------------------------------------------

    /// @notice Thrown when retrying a call id that has no stored failed message.
    error NO_FAILED_MESSAGE(bytes32 callId);

    /// @notice Thrown when an inbound message reuses a call id that is already
    ///         stored as failed and pending retry.
    error MESSAGE_ALREADY_PENDING(bytes32 callId);
}
