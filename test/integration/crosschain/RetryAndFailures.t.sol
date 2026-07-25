// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {CrossChainE2EBase} from "./CrossChainE2EBase.sol";
import {DAO} from "../../../src/core/dao/DAO.sol";
import {Action} from "../../../src/common/executors/IExecutor.sol";
import {Errors} from "../../../src/common/crosschain/lib/Errors.sol";
import {
    ICrossChainController
} from "../../../src/common/crosschain/ICrossChainController.sol";
import {
    DaoUnauthorized
} from "../../../src/common/permission/auth/auth.sol";
import {
    TransactionLib,
    Transaction
} from "../../../src/common/crosschain/lib/Transaction.sol";
import {
    GuardedTarget,
    ValueSink
} from "../../mocks/commons/crosschain/E2ETargets.sol";
import {
    ActionExecute
} from "../../mocks/commons/executors/ActionExecute.sol";

/// @title CrossChainRetryAndFailuresTest
/// @notice The two INDEPENDENT retry layers, and every way a delivered payload
///         can fail.
///
/// @dev Covers plan sections B and D.
///
///      THE TWO LAYERS. This is the least obvious property of the design, and
///      the distinction every test in this file turns on:
///
///      LAYER 2 -- APPLICATION. `receiveMessage` wraps the DAO execution in a
///      `try/catch`. A payload that reverts is CAUGHT: the bridge delivery
///      still succeeds, the transaction is recorded as `Delivered`, and
///      `MessageExecutionFailed` carries the reason. Recovery is
///      `retryMessage`, which needs `RETRY_MESSAGE_PERMISSION`.
///
///      LAYER 1 -- BRIDGE. If `ccipReceive` itself reverts -- a rejected
///      sender, a cleared lane, a rotated adapter, too little gas -- nothing is
///      stored at all. The transaction stays `None` and CCIP marks the message
///      failed but manually executable. Recovery is a CCIP re-execution, which
///      needs no permission from us and works once the cause is fixed.
///
///      Reading the tests: `success` from `_deliver*` is the BRIDGE-level
///      outcome. `success == true` with state `Delivered` is a payload failure;
///      `success == false` with state `None` is a delivery failure.
contract CrossChainRetryAndFailuresTest is CrossChainE2EBase {
    /// @dev Sends a message whose payload will fail, and delivers it. Returns
    ///      the ids and the exact envelope bytes needed to retry it.
    function _deliverFailingMessage()
        internal
        returns (bytes32 txId, bytes memory encodedTx)
    {
        destination.target.setLocked(true);

        txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _cancelPayload(destination)
        );
        encodedTx = _queuedPayload(origin, 0);

        (, bool success) = _deliverNext(origin, destination);

        assertTrue(success, "the BRIDGE delivery should succeed");
        _assertDelivered(destination, txId);
    }

    // -------------------------------------------------------------------------
    // Layer 2: application-level retry
    // -------------------------------------------------------------------------

    /// @notice The core failure-then-retry loop: a reverting action is stored,
    ///         the cause is fixed, and the DAO retries it.
    function test_retry_failedActionIsStoredThenRetriedAfterTheFix() public {
        bytes32 messageId = keccak256(
            abi.encode(
                ORIGIN_SELECTOR,
                DESTINATION_SELECTOR,
                address(origin.controller),
                uint64(0)
            )
        );

        destination.target.setLocked(true);
        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _cancelPayload(destination)
        );
        bytes memory encodedTx = _queuedPayload(origin, 0);

        _on(destination);
        vm.expectEmit(true, true, true, true, address(destination.controller));
        emit MessageExecutionFailed(
            origin.chainId,
            messageId,
            txId,
            encodedTx,
            abi.encodeWithSelector(DAO.ActionFailed.selector, 0)
        );
        assertTrue(origin.router.deliver(messageId));

        _assertDelivered(destination, txId);
        assertEq(destination.target.cancellations(), 0, "must not have run");

        // Fix the cause and retry as the DAO.
        destination.target.setLocked(false);

        vm.expectEmit(true, false, false, false, address(destination.controller));
        emit MessageRetried(txId);
        vm.prank(address(destination.dao));
        destination.controller.retryMessage(encodedTx);

        _assertExecuted(destination, txId);
        assertEq(destination.target.cancellations(), 1, "retry should have run");
        assertEq(destination.target.lastCaller(), address(destination.dao));
    }

    /// @notice A DAO that holds `RETRY_MESSAGE_PERMISSION` CANNOT USE IT, because
    ///         the only way a DAO acts is by executing a proposal -- and
    ///         `retryMessage` has to re-enter `DAO.execute`, which the DAO's
    ///         reentrancy guard forbids.
    /// @dev Every other test in this file retries with `vm.prank(dao)`, i.e. a
    ///      direct external call from the DAO's address. That is NOT a path
    ///      that exists in production: a DAO only ever acts through
    ///      `DAO.execute`. This test takes the production path and shows it
    ///      fails.
    ///
    ///      The practical consequence is that `RETRY_MESSAGE_PERMISSION` must
    ///      be held by an account that can call the controller DIRECTLY -- an
    ///      ops multisig or an EOA. Granting it to the DAO, which is the
    ///      natural-looking choice and what a first-pass deployment script
    ///      would do, produces a stack where failed messages can never be
    ///      retried at all.
    ///
    ///      See also `Reentrancy.t.sol`, where the same mechanic blocks a
    ///      cross-chain proposal from clearing a stuck message.
    function test_retry_daoCannotRetryThroughAProposal() public {
        (bytes32 txId, bytes memory encodedTx) = _deliverFailingMessage();
        destination.target.setLocked(false);

        Action[] memory actions = new Action[](1);
        actions[0] = Action({
            to: address(destination.controller),
            value: 0,
            data: abi.encodeCall(
                ICrossChainController.retryMessage,
                (encodedTx)
            )
        });

        _on(destination);
        vm.prank(plugin);
        vm.expectRevert(
            abi.encodeWithSelector(DAO.ActionFailed.selector, uint256(0))
        );
        destination.dao.execute(keccak256("retry-proposal"), actions, 0);

        _assertDelivered(destination, txId);
        assertEq(destination.target.cancellations(), 0);
    }

    /// @notice The retry DOES work when the permission is held by an account
    ///         that calls the controller directly.
    /// @dev The counterpart to the test above: this is the wiring a production
    ///      deployment needs.
    function test_retry_opsAccountHoldingThePermissionCanRetry() public {
        (bytes32 txId, bytes memory encodedTx) = _deliverFailingMessage();
        destination.target.setLocked(false);

        address opsMultisig = makeAddr("opsMultisig");
        destination.dao.grant(
            address(destination.controller),
            opsMultisig,
            RETRY_MESSAGE_PERMISSION_ID
        );

        _on(destination);
        vm.prank(opsMultisig);
        destination.controller.retryMessage(encodedTx);

        _assertExecuted(destination, txId);
        assertEq(destination.target.cancellations(), 1);
    }

    /// @notice Retrying needs the permission; the bridge already authenticated
    ///         the payload, but replaying it is still a privileged action.
    function test_retry_requiresTheRetryPermission() public {
        (, bytes memory encodedTx) = _deliverFailingMessage();
        destination.target.setLocked(false);

        _on(destination);
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector,
                address(destination.dao),
                address(destination.controller),
                stranger,
                RETRY_MESSAGE_PERMISSION_ID
            )
        );
        destination.controller.retryMessage(encodedTx);
    }

    /// @notice Retrying something that was never delivered is rejected.
    function test_retry_unknownTransactionIsRejected() public {
        bytes memory encodedTx = _encodedTx(
            origin,
            destination,
            99,
            address(origin.dao),
            _cancelPayload(destination)
        );

        _on(destination);
        vm.prank(address(destination.dao));
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.MESSAGE_ALREADY_EXECUTED_OR_NOT_EXISTS.selector,
                TransactionLib.id(encodedTx)
            )
        );
        destination.controller.retryMessage(encodedTx);
    }

    /// @notice A transaction that already succeeded cannot be retried.
    function test_retry_alreadyExecutedTransactionIsRejected() public {
        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _cancelPayload(destination)
        );
        bytes memory encodedTx = _queuedPayload(origin, 0);
        _deliverNext(origin, destination);
        _assertExecuted(destination, txId);

        _on(destination);
        vm.prank(address(destination.dao));
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.MESSAGE_ALREADY_EXECUTED_OR_NOT_EXISTS.selector,
                txId
            )
        );
        destination.controller.retryMessage(encodedTx);
    }

    /// @notice A successful retry cannot be replayed: the action runs once.
    function test_retry_cannotBeReplayedAfterSucceeding() public {
        (bytes32 txId, bytes memory encodedTx) = _deliverFailingMessage();
        destination.target.setLocked(false);

        _on(destination);
        vm.prank(address(destination.dao));
        destination.controller.retryMessage(encodedTx);
        assertEq(destination.target.cancellations(), 1);

        vm.prank(address(destination.dao));
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.MESSAGE_ALREADY_EXECUTED_OR_NOT_EXISTS.selector,
                txId
            )
        );
        destination.controller.retryMessage(encodedTx);

        assertEq(destination.target.cancellations(), 1, "must run only once");
    }

    /// @notice A retry that fails again leaves the transaction retryable.
    /// @dev `retryMessage` writes `Executed` BEFORE executing. When the
    ///      execution reverts the whole call reverts, so that write is rolled
    ///      back and the state is still `Delivered`. Without that ordering a
    ///      failed retry would burn the message permanently.
    function test_retry_thatFailsAgainStaysRetryable() public {
        (bytes32 txId, bytes memory encodedTx) = _deliverFailingMessage();

        // Still locked: the retry fails.
        _on(destination);
        vm.prank(address(destination.dao));
        vm.expectRevert(
            abi.encodeWithSelector(DAO.ActionFailed.selector, uint256(0))
        );
        destination.controller.retryMessage(encodedTx);

        _assertDelivered(destination, txId);

        // A second retry fails identically.
        vm.prank(address(destination.dao));
        vm.expectRevert(
            abi.encodeWithSelector(DAO.ActionFailed.selector, uint256(0))
        );
        destination.controller.retryMessage(encodedTx);

        _assertDelivered(destination, txId);

        // And once the cause is fixed, the third attempt lands.
        destination.target.setLocked(false);
        vm.prank(address(destination.dao));
        destination.controller.retryMessage(encodedTx);

        _assertExecuted(destination, txId);
        assertEq(destination.target.cancellations(), 1);
    }

    /// @notice Tampering with the envelope changes its id, so the tampered
    ///         bytes match no stored transaction.
    /// @dev The retry path takes RAW BYTES from the caller and trusts only
    ///      their hash. This is what makes that safe: a retrier holding the
    ///      permission still cannot swap in a different payload.
    function test_retry_tamperedEnvelopeIsRejected() public {
        (, bytes memory encodedTx) = _deliverFailingMessage();
        destination.target.setLocked(false);

        Transaction memory decoded = TransactionLib.decode(encodedTx);

        // Redirect the action at a target the attacker controls.
        GuardedTarget attackerTarget = new GuardedTarget();
        Action[] memory actions = new Action[](1);
        actions[0] = Action({
            to: address(attackerTarget),
            value: 0,
            data: abi.encodeCall(GuardedTarget.cancelRootUpdate, ())
        });
        decoded.message = abi.encode(actions);

        bytes memory tampered = TransactionLib.encode(decoded);

        _on(destination);
        vm.prank(address(destination.dao));
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.MESSAGE_ALREADY_EXECUTED_OR_NOT_EXISTS.selector,
                TransactionLib.id(tampered)
            )
        );
        destination.controller.retryMessage(tampered);

        assertEq(attackerTarget.cancellations(), 0, "must not have run");
    }

    /// @notice Bumping the nonce in the envelope is caught the same way.
    function test_retry_envelopeWithABumpedNonceIsRejected() public {
        (, bytes memory encodedTx) = _deliverFailingMessage();

        Transaction memory decoded = TransactionLib.decode(encodedTx);
        decoded.nonce += 1;
        bytes memory tampered = TransactionLib.encode(decoded);

        _on(destination);
        vm.prank(address(destination.dao));
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.MESSAGE_ALREADY_EXECUTED_OR_NOT_EXISTS.selector,
                TransactionLib.id(tampered)
            )
        );
        destination.controller.retryMessage(tampered);
    }

    /// @notice A bridge-level redelivery cannot bypass the application-level
    ///         retry: a stored `Delivered` transaction rejects a second arrival.
    function test_retry_bridgeRedeliveryOfAStoredMessageIsRejected() public {
        (bytes32 txId, bytes memory encodedTx) = _deliverFailingMessage();

        (bool success, bytes memory reason) = _forgeDelivery(
            destination,
            keccak256("a-second-arrival"),
            ORIGIN_SELECTOR,
            address(origin.controller),
            encodedTx,
            GAS_LIMIT
        );

        assertFalse(success, "redelivery must be rejected");
        assertEq(
            reason,
            abi.encodeWithSelector(
                Errors.MESSAGE_ALREADY_DELIVERED_OR_EXECUTED.selector,
                txId
            )
        );
        _assertDelivered(destination, txId);
    }

    // -------------------------------------------------------------------------
    // Layer 1: bridge-level failure and manual re-execution
    // -------------------------------------------------------------------------

    /// @notice A lane cleared while a message is in flight rejects it at the
    ///         BRIDGE level -- and the message is not lost: re-configuring the
    ///         lane and re-executing delivers it.
    function test_bridgeRetry_clearedLaneRejectsThenRecoversAfterReconfig()
        public
    {
        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _cancelPayload(destination)
        );
        bytes32 messageId = origin.router.messageIdAt(0);

        // Ops clears the inbound lane while the message is in flight.
        _clearLane(destination, origin.chainId);

        (, bool success) = _deliverNext(origin, destination);

        assertFalse(success, "delivery must fail at the bridge level");
        _assertUnknown(destination, txId);
        assertEq(destination.target.cancellations(), 0);

        // Nothing was stored, so the message is still cleanly re-executable.
        _configureLane(destination, origin.chainId, address(origin.adapter));

        assertTrue(_manualExecute(origin, destination, messageId, GAS_LIMIT));
        _assertExecuted(destination, txId);
        assertEq(destination.target.cancellations(), 1);
    }

    /// @notice The same for an adapter rotation: an in-flight message arrives
    ///         through the OLD adapter, which the controller no longer knows.
    /// @dev The recovery here is to point the lane back. A permanent rotation
    ///      strands in-flight messages until the new adapter can deliver them,
    ///      which is worth knowing before rotating one in production.
    function test_bridgeRetry_rotatedAdapterRejectsThenRecovers() public {
        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _cancelPayload(destination)
        );
        bytes32 messageId = origin.router.messageIdAt(0);

        // Rotate the destination's local adapter to a different address.
        _configureLaneWithLocalAdapter(
            destination,
            origin.chainId,
            makeAddr("newAdapter"),
            address(origin.adapter)
        );

        (, bool success) = _deliverNext(origin, destination);

        assertFalse(success, "the old adapter is no longer authorised");
        _assertUnknown(destination, txId);

        // Point the lane back and re-execute.
        _configureLane(destination, origin.chainId, address(origin.adapter));

        assertTrue(_manualExecute(origin, destination, messageId, GAS_LIMIT));
        _assertExecuted(destination, txId);
    }

    // -------------------------------------------------------------------------
    // Execution errors -- every way a delivered payload can fail
    // -------------------------------------------------------------------------

    /// @notice The stored reason identifies WHICH action of the payload failed.
    /// @dev `DAO.execute` wraps every action revert in `ActionFailed(index)`,
    ///      so the target's own error (here `GuardedTarget.Locked`) never
    ///      reaches the event. What an operator gets instead is the index --
    ///      and that is the thing worth pinning, because it is what tells them
    ///      where in a multi-action cross-chain proposal the failure was.
    function test_failure_reasonIdentifiesTheFailingActionIndex() public {
        GuardedTarget locked = new GuardedTarget();
        locked.setLocked(true);

        Action[] memory actions = new Action[](3);
        actions[0] = Action({
            to: address(destination.target),
            value: 0,
            data: abi.encodeCall(GuardedTarget.cancelRootUpdate, ())
        });
        actions[1] = Action({
            to: address(locked),
            value: 0,
            data: abi.encodeCall(GuardedTarget.cancelRootUpdate, ())
        });
        actions[2] = Action({
            to: address(destination.target),
            value: 0,
            data: abi.encodeCall(GuardedTarget.cancelRootUpdate, ())
        });

        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            abi.encode(actions)
        );
        bytes memory encodedTx = _queuedPayload(origin, 0);
        bytes32 messageId = origin.router.messageIdAt(0);

        _on(destination);
        vm.expectEmit(true, true, true, true, address(destination.controller));
        emit MessageExecutionFailed(
            origin.chainId,
            messageId,
            txId,
            encodedTx,
            abi.encodeWithSelector(DAO.ActionFailed.selector, uint256(1))
        );
        assertTrue(origin.router.deliver(messageId));

        _assertDelivered(destination, txId);

        // The whole payload is atomic: action 0 rolled back with the rest.
        assertEq(
            destination.target.cancellations(),
            0,
            "a failed payload must leave no partial effect"
        );
    }

    /// @notice An action pointed at an address with NO CODE is reported as a
    ///         SUCCESS, and the message is marked `Executed`.
    /// @dev A raw `.call` to a codeless address returns true, so `DAO.execute`
    ///      sees no failure. Nothing in the cross-chain path can detect this --
    ///      a cross-chain proposal whose target is mistyped, or not yet
    ///      deployed on the destination, executes to a silent no-op. Worth
    ///      knowing when reviewing cross-chain proposals.
    function test_failure_codelessActionTargetSilentlySucceeds() public {
        address notDeployed = makeAddr("notDeployedOnDestination");
        assertEq(notDeployed.code.length, 0);

        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _actionPayload(
                notDeployed,
                0,
                abi.encodeCall(GuardedTarget.cancelRootUpdate, ())
            )
        );
        (, bool success) = _deliverNext(origin, destination);

        assertTrue(success);
        _assertExecuted(destination, txId);
    }

    /// @notice A payload that is not a valid `Action[]` is CAUGHT, not
    ///         propagated to the bridge.
    /// @dev This is why `abi.decode` lives inside `executeActions` rather than
    ///      in `receiveMessage`: a malformed payload becomes a retryable
    ///      application failure instead of a bridge-level revert.
    function test_failure_malformedPayloadIsCaughtAndStored() public {
        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            hex"deadbeef"
        );
        (, bool success) = _deliverNext(origin, destination);

        assertTrue(success, "the bridge delivery must still succeed");
        _assertDelivered(destination, txId);
    }

    /// @notice More actions than the DAO accepts is likewise caught.
    function test_failure_tooManyActionsIsCaughtAndStored() public {
        Action[] memory actions = new Action[](257);
        for (uint256 i = 0; i < actions.length; i++) {
            actions[i] = Action({
                to: address(destination.target),
                value: 0,
                data: abi.encodeCall(GuardedTarget.cancelRootUpdate, ())
            });
        }

        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            5_000_000,
            abi.encode(actions)
        );
        (, bool success) = _deliverNext(origin, destination);

        assertTrue(success);
        _assertDelivered(destination, txId);
        assertEq(destination.target.cancellations(), 0);
    }

    /// @notice An action needing more value than the destination DAO holds
    ///         fails, and succeeds on retry once the treasury is topped up.
    function test_failure_insufficientTreasuryFailsThenRetriesAfterFunding()
        public
    {
        ValueSink sink = new ValueSink();

        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _actionPayload(address(sink), 5 ether, "")
        );
        bytes memory encodedTx = _queuedPayload(origin, 0);

        _deliverNext(origin, destination);
        _assertDelivered(destination, txId);
        assertEq(sink.received(), 0);

        vm.deal(address(destination.dao), 5 ether);

        _on(destination);
        vm.prank(address(destination.dao));
        destination.controller.retryMessage(encodedTx);

        _assertExecuted(destination, txId);
        assertEq(sink.received(), 5 ether);
    }

    /// @notice A controller without `EXECUTE_PERMISSION` on its own DAO stores
    ///         the failure, and the message lands once the grant is made.
    function test_failure_missingExecutePermissionFailsThenRetriesAfterGrant()
        public
    {
        destination.dao.revoke(
            address(destination.dao),
            address(destination.controller),
            EXECUTE_PERMISSION_ID
        );

        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _cancelPayload(destination)
        );
        bytes memory encodedTx = _queuedPayload(origin, 0);

        (, bool success) = _deliverNext(origin, destination);

        assertTrue(success, "the bridge delivery still succeeds");
        _assertDelivered(destination, txId);

        destination.dao.grant(
            address(destination.dao),
            address(destination.controller),
            EXECUTE_PERMISSION_ID
        );

        _on(destination);
        vm.prank(address(destination.dao));
        destination.controller.retryMessage(encodedTx);

        _assertExecuted(destination, txId);
        assertEq(destination.target.cancellations(), 1);
    }

    /// @notice An action that re-enters `DAO.execute` is blocked by the DAO's
    ///         reentrancy guard, and the message is stored as failed.
    function test_failure_actionReenteringTheDaoIsBlocked() public {
        ActionExecute reenterer = new ActionExecute();

        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _actionPayload(
                address(reenterer),
                0,
                abi.encodeCall(ActionExecute.callBackCaller, ())
            )
        );
        (, bool success) = _deliverNext(origin, destination);

        assertTrue(success);
        _assertDelivered(destination, txId);
    }
}
