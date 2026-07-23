// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {CrossChainControllerBase} from "./Base.t.sol";
import {
    CrossChainController
} from "@aragon/osx-commons-contracts/src/crosschain/CrossChainController.sol";
import {
    Errors
} from "@aragon/osx-commons-contracts/src/crosschain/lib/Errors.sol";
import {
    TransactionState
} from "@aragon/osx-commons-contracts/src/crosschain/lib/Transaction.sol";
import {Action} from "../../../../../src/common/executors/IExecutor.sol";
import {
    AdapterMock
} from "../../../../mocks/commons/crosschain/AdapterMock.sol";
import {
    ActionExecute
} from "../../../../mocks/commons/executors/ActionExecute.sol";

contract CrossChainControllerReceiveMessageTest is CrossChainControllerBase {
    // -------------------------------------------------------------------------
    // Inbound authentication.
    // -------------------------------------------------------------------------

    function test_revertsForCallerNotLocalAdapter() public {
        address random = makeAddr("random");
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.CALLER_NOT_LOCAL_ADAPTER.selector,
                random
            )
        );
        vm.prank(random);
        controller.receiveMessage(
            bytes32(uint256(1)),
            _encodedEmptyTx(1, CHAIN_ID),
            CHAIN_ID
        );
    }

    function test_revertsForUnregisteredContract() public {
        // A deployed contract that was never configured as a lane's local
        // adapter is just as unauthorized as an EOA.
        AdapterMock strangerAdapter = new AdapterMock(
            address(controller),
            address(0),
            0,
            bytes32(0),
            feeSinkA,
            false,
            false
        );
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.CALLER_NOT_LOCAL_ADAPTER.selector,
                address(strangerAdapter)
            )
        );
        vm.prank(address(strangerAdapter));
        controller.receiveMessage(
            bytes32(uint256(1)),
            _encodedEmptyTx(1, CHAIN_ID),
            CHAIN_ID
        );
    }

    function test_succeedsForRegisteredLocalAdapter() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);

        bytes32 messageId = bytes32(uint256(42));
        vm.prank(address(adapterA));
        bytes32 txId = controller.receiveMessage(
            messageId,
            _encodedEmptyTx(1, CHAIN_ID),
            CHAIN_ID
        );

        assertEq(txId, _txId(1, CHAIN_ID, _emptyActionsPayload()));
    }

    // -------------------------------------------------------------------------
    // Identity / dedup.
    // -------------------------------------------------------------------------

    function test_revertsIfMessageAlreadyDeliveredOrExecuted() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);

        Action[] memory actions = new Action[](1);
        actions[0] = Action({
            to: address(actionTarget),
            value: 0,
            data: abi.encodeCall(ActionExecute.fail, ())
        });
        bytes memory message = abi.encode(actions);
        bytes memory encodedTx = _encodedTx(7, CHAIN_ID, message);
        bytes32 txId = _txId(7, CHAIN_ID, message);

        // First delivery fails execution and is stored as `Delivered`.
        vm.prank(address(adapterA));
        controller.receiveMessage(bytes32(uint256(7)), encodedTx, CHAIN_ID);
        assertEq(
            uint256(controller.getTransactionState(txId)),
            uint256(TransactionState.Delivered)
        );

        // Redelivering the same envelope (same txId) must revert, not
        // overwrite/duplicate it -- regardless of the bridge messageId.
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.MESSAGE_ALREADY_DELIVERED_OR_EXECUTED.selector,
                txId
            )
        );
        vm.prank(address(adapterA));
        controller.receiveMessage(bytes32(uint256(8)), encodedTx, CHAIN_ID);
    }

    /// @dev The nonce is what makes each delivery a distinct message. Deliver
    ///      an envelope, then deliver a SECOND envelope identical in every
    ///      field except the nonce: it must succeed (a new txId), not be
    ///      rejected as an already-delivered duplicate. Both executions are
    ///      observed on-chain so "succeeds" means the action actually ran
    ///      twice, not merely that the second call didn't revert.
    function test_sameEnvelopeWithNewNonceSucceeds() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);

        CounterTarget counter = new CounterTarget();
        Action[] memory actions = new Action[](1);
        actions[0] = Action({
            to: address(counter),
            value: 0,
            data: abi.encodeCall(CounterTarget.increment, ())
        });
        bytes memory message = abi.encode(actions);

        // First delivery, nonce 1.
        bytes memory encodedTx1 = _encodedTx(1, CHAIN_ID, message);
        bytes32 txId1 = _txId(1, CHAIN_ID, message);

        vm.prank(address(adapterA));
        bytes32 returned1 = controller.receiveMessage(
            bytes32(uint256(1)),
            encodedTx1,
            CHAIN_ID
        );

        assertEq(returned1, txId1);
        assertEq(
            uint256(controller.getTransactionState(txId1)),
            uint256(TransactionState.Executed)
        );
        assertEq(counter.count(), 1);

        // Second delivery: EVERYTHING identical except nonce (1 -> 2). The
        // whole-struct id therefore differs, so this is a fresh message and
        // must NOT hit MESSAGE_ALREADY_DELIVERED_OR_EXECUTED.
        bytes memory encodedTx2 = _encodedTx(2, CHAIN_ID, message);
        bytes32 txId2 = _txId(2, CHAIN_ID, message);
        assertTrue(txId2 != txId1);

        vm.prank(address(adapterA));
        bytes32 returned2 = controller.receiveMessage(
            bytes32(uint256(1)), // even the bridge messageId is reused: irrelevant
            encodedTx2,
            CHAIN_ID
        );

        assertEq(returned2, txId2);
        assertEq(
            uint256(controller.getTransactionState(txId2)),
            uint256(TransactionState.Executed)
        );
        // The action ran a second time.
        assertEq(counter.count(), 2);
    }

    // -------------------------------------------------------------------------
    // Defensive capture (a failed/malformed inner payload is stored for retry
    // rather than reverting the bridge delivery).
    // -------------------------------------------------------------------------

    function test_capturesRevertingPayloadInsteadOfReverting() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);

        Action[] memory actions = new Action[](1);
        actions[0] = Action({
            to: address(actionTarget),
            value: 0,
            data: abi.encodeCall(ActionExecute.fail, ())
        });
        bytes memory message = abi.encode(actions);
        bytes memory encodedTx = _encodedTx(55, CHAIN_ID, message);

        bytes32 messageId = bytes32(uint256(55));
        bytes32 expectedTxId = _txId(55, CHAIN_ID, message);
        // `CrossChainControllerDAOMock.execute` bubbles the low-level call's
        // raw returndata on failure, which is `ActionExecute.fail`'s
        // `Error(string)`-encoded revert reason.
        bytes memory expectedReason = abi.encodeWithSignature(
            "Error(string)",
            "ActionExecute:Revert"
        );

        vm.expectEmit(true, true, true, true, address(controller));
        emit MessageExecutionFailed(
            CHAIN_ID,
            messageId,
            expectedTxId,
            expectedReason
        );

        vm.prank(address(adapterA));
        bytes32 txId = controller.receiveMessage(
            messageId,
            encodedTx,
            CHAIN_ID
        ); // must NOT revert
        assertEq(txId, expectedTxId);

        // A failed execution is stored as `Delivered` (awaiting retry).
        assertEq(
            uint256(controller.getTransactionState(txId)),
            uint256(TransactionState.Delivered)
        );
    }

    function test_capturesMalformedInnerPayloadInsteadOfReverting() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);

        // A WELL-FORMED envelope whose inner `message` is not a valid
        // ABI-encoding of `Action[]`. The envelope decode succeeds (so
        // `receiveMessage` does not revert on the outer decode); the inner
        // `abi.decode(message, (Action[]))` inside `executeActions` fails and
        // is captured via try/catch.
        bytes memory garbageMessage = hex"deadbeef";
        bytes memory encodedTx = _encodedTx(56, CHAIN_ID, garbageMessage);

        bytes32 messageId = bytes32(uint256(56));
        bytes32 expectedTxId = _txId(56, CHAIN_ID, garbageMessage);

        // Only check the indexed topics here (origin/message/tx id); the
        // exact revert bytes produced by a failed `abi.decode` are an
        // implementation/compiler detail we don't want to pin.
        vm.expectEmit(true, true, true, false, address(controller));
        emit MessageExecutionFailed(CHAIN_ID, messageId, expectedTxId, "");

        vm.prank(address(adapterA));
        bytes32 txId = controller.receiveMessage(
            messageId,
            encodedTx,
            CHAIN_ID
        ); // must NOT revert
        assertEq(txId, expectedTxId);
        assertEq(
            uint256(controller.getTransactionState(txId)),
            uint256(TransactionState.Delivered)
        );
    }
}

/// @dev Minimal target with observable, readable state, used to prove an
///      action actually executed (and how many times) rather than inferring
///      success from the absence of a revert.
contract CounterTarget {
    uint256 public count;

    function increment() external {
        count += 1;
    }
}
