// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {CrossChainE2EBase} from "./CrossChainE2EBase.sol";
import {GasConsumer} from "../../mocks/commons/executors/GasConsumer.sol";

/// @title CrossChainGasLimitsTest
/// @notice What the destination gas limit -- chosen on the ORIGIN chain, at
///         send time, by whoever wrote the proposal -- decides.
///
/// @dev Covers plan section C.
///
///      CCIP hands the receiver EXACTLY the gas the sender paid for, via
///      `CallWithExactGas`. Because `receiveMessage` runs the payload through a
///      `try/catch`, and because EIP-150 retains 1/64 of the gas for the
///      calling frame, there are THREE outcomes rather than two, and which one
///      you get is a function of that single number:
///
///      1. plenty of gas          -> executed;
///      2. too little for the DAO execution but enough for the `catch` to
///         finish -> the failure is CAUGHT and stored as `Delivered`,
///         recoverable only with `RETRY_MESSAGE_PERMISSION`;
///      3. too little for even that -> the whole `ccipReceive` reverts,
///         nothing is stored, and CCIP leaves the message manually executable
///         by anyone.
///
///      Case 2 is the one worth internalising: an under-gassed message ends up
///      in a state whose ONLY exit is a permissioned retry. That is the
///      concrete argument for holding `RETRY_MESSAGE_PERMISSION` on an ops
///      multisig and not solely on the DAO -- recovering otherwise needs a full
///      governance cycle.
///
///      The gas numbers below are chosen with wide margins around the
///      boundaries, but they ARE compiler- and optimiser-sensitive. If one of
///      these fails after a toolchain bump, the fix is to re-measure the
///      boundary, not to delete the test: the three regimes are real.
contract CrossChainGasLimitsTest is CrossChainE2EBase {
    /// @dev An action that burns far more gas than any limit used here.
    function _expensivePayload(
        GasConsumer _consumer
    ) internal pure returns (bytes memory) {
        return
            _actionPayload(
                address(_consumer),
                0,
                abi.encodeCall(GasConsumer.consumeGas, (100))
            );
    }

    // -------------------------------------------------------------------------
    // The gas limit reaches the destination unchanged
    // -------------------------------------------------------------------------

    /// @notice The limit requested at send time is the limit the destination is
    ///         given, having survived the `extraArgs` round trip.
    /// @dev If `GenericExtraArgsV2` were encoded with the wrong tag or the
    ///      wrong field order, CCIP would silently fall back to its 200k
    ///      default and every one of these regimes would shift underneath us.
    function test_gas_requestedLimitSurvivesTheExtraArgsRoundTrip() public {
        _forwardViaProposal(
            origin,
            destination,
            777_000,
            _cancelPayload(destination)
        );

        assertEq(
            origin.router.sentAt(0).gasLimit,
            777_000,
            "the destination must receive the gas limit that was requested"
        );
    }

    // -------------------------------------------------------------------------
    // Regime 1: enough gas
    // -------------------------------------------------------------------------

    /// @notice A generous limit executes the payload.
    function test_gas_sufficientLimitExecutes() public {
        GasConsumer consumer = new GasConsumer();

        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            6_000_000,
            _expensivePayload(consumer)
        );
        (, bool success) = _deliverNext(origin, destination);

        assertTrue(success);
        _assertExecuted(destination, txId);
        assertEq(consumer.store(99), 1, "the expensive action should have run");
    }

    // -------------------------------------------------------------------------
    // Regime 2: the 63/64 window -- caught, stored, permissioned recovery
    // -------------------------------------------------------------------------

    /// @notice A limit too small for the payload but large enough for the
    ///         `catch` leaves the message `Delivered`, i.e. recoverable ONLY
    ///         through the permissioned retry.
    /// @dev 2M is comfortably above the ~1.6M needed for the retained 1/64 to
    ///      cover the state write and the event, and comfortably below the
    ///      ~2.2M the action itself needs.
    function test_gas_tooLittleForThePayloadIsCaughtAndStored() public {
        GasConsumer consumer = new GasConsumer();

        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            2_000_000,
            _expensivePayload(consumer)
        );
        bytes memory encodedTx = _queuedPayload(origin, 0);

        (, bool success) = _deliverNext(origin, destination);

        assertTrue(
            success,
            "the BRIDGE delivery succeeded -- CCIP considers this message done"
        );
        _assertDelivered(destination, txId);
        assertEq(consumer.store(0), 0, "the action must not have run");

        // CCIP is finished with it, so the only exit is the permissioned retry.
        _on(destination);
        vm.prank(address(destination.dao));
        destination.controller.retryMessage(encodedTx);

        _assertExecuted(destination, txId);
        assertEq(consumer.store(99), 1);
    }

    /// @notice The same window reached by an action that deliberately burns
    ///         everything it is given.
    /// @dev The griefing question: can a hostile destination action make the
    ///      controller lose the message? No -- the `catch` still records it, so
    ///      the worst case is a permissioned retry, never a lost message.
    function test_gas_actionBurningAllGasStillLeavesTheMessageRecoverable()
        public
    {
        GasConsumer burner = new GasConsumer();

        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            2_000_000,
            _actionPayload(
                address(burner),
                0,
                abi.encodeCall(GasConsumer.consumeGas, (10_000))
            )
        );

        (, bool success) = _deliverNext(origin, destination);

        assertTrue(success);
        _assertDelivered(destination, txId);
    }

    // -------------------------------------------------------------------------
    // Regime 3: bridge-level failure -- nothing stored, anyone can re-execute
    // -------------------------------------------------------------------------

    /// @notice A limit too small for even the bookkeeping reverts the whole
    ///         delivery, stores nothing, and stays manually executable.
    /// @dev This is the GOOD failure mode: CCIP marks the message failed and
    ///      anyone may re-execute it with more gas, no permission required.
    function test_gas_tooLittleForTheDeliveryLeavesNothingStored() public {
        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            30_000,
            _cancelPayload(destination)
        );
        bytes32 messageId = origin.router.messageIdAt(0);

        (, bool success) = _deliverNext(origin, destination);

        assertFalse(success, "the delivery itself must fail");
        _assertUnknown(destination, txId);
        assertEq(destination.target.cancellations(), 0);

        // Manual execution with a workable limit -- permissionless.
        assertTrue(
            _manualExecute(origin, destination, messageId, 500_000),
            "manual re-execution should succeed"
        );
        _assertExecuted(destination, txId);
        assertEq(destination.target.cancellations(), 1);
    }

    /// @notice A zero gas limit is the degenerate case of the same regime.
    /// @dev Our payload is never empty, so CCIP does call the receiver -- with
    ///      no gas at all. Nothing is stored, and the message is recoverable.
    function test_gas_zeroLimitFailsAtTheBridgeAndStaysRecoverable() public {
        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            0,
            _cancelPayload(destination)
        );
        bytes32 messageId = origin.router.messageIdAt(0);

        (, bool success) = _deliverNext(origin, destination);

        assertFalse(success);
        _assertUnknown(destination, txId);

        assertTrue(_manualExecute(origin, destination, messageId, 500_000));
        _assertExecuted(destination, txId);
    }

    /// @notice Manual execution that is STILL under-gassed changes nothing and
    ///         can be attempted again.
    function test_gas_underGassedManualExecutionCanBeRetried() public {
        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            30_000,
            _cancelPayload(destination)
        );
        bytes32 messageId = origin.router.messageIdAt(0);

        _deliverNext(origin, destination);
        _assertUnknown(destination, txId);

        assertFalse(
            _manualExecute(origin, destination, messageId, 40_000),
            "still not enough"
        );
        _assertUnknown(destination, txId);

        assertTrue(_manualExecute(origin, destination, messageId, 500_000));
        _assertExecuted(destination, txId);
    }
}
