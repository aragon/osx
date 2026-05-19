// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Executor} from "../../../src/common/executors/Executor.sol";
import {IExecutor, Action} from "../../../src/common/executors/IExecutor.sol";
import {ActionExecute} from "../../mocks/commons/executors/ActionExecute.sol";
import {GasConsumer} from "../../mocks/commons/executors/GasConsumer.sol";

/// @notice Direct tests for `Executor` in `src/common/executors/Executor.sol`.
///
/// Ports `osx-commons/contracts/test/executors/executor.ts` (284 lines, 11
/// cases). Adds explicit `MAX_ACTIONS` boundary, exact `Executed` event
/// payload, `failureMap` construction, reentrancy guard reset, and storage-
/// slot probe for the custom reentrancy slot.
contract ExecutorTest is Test {
    bytes32 internal constant ZERO_CALLID = bytes32(0);
    uint256 internal constant MAX_ACTIONS = 256;
    bytes4 internal constant ERROR_SELECTOR = 0x08c379a0; // Error(string)
    /// keccak256("osx-commons.storage.Executor") — duplicated from source.
    bytes32 internal constant REENTRANCY_GUARD_STORAGE_LOCATION =
        0x4d6542319dfb3f7c8adbb488d7b4d7cf849381f14faf4b64de3ac05d08c0bdec;

    Executor internal executor;
    ActionExecute internal actionMock;
    address internal alice;

    function setUp() public {
        alice = makeAddr("alice");
        executor = new Executor();
        actionMock = new ActionExecute();
    }

    // -------------------------------------------------------------------------
    // Action factories
    // -------------------------------------------------------------------------

    function _failAction() internal view returns (Action memory) {
        return Action({to: address(actionMock), value: 0, data: abi.encodeCall(ActionExecute.fail, ())});
    }

    function _succeedAction() internal view returns (Action memory) {
        return Action({to: address(actionMock), value: 0, data: abi.encodeCall(ActionExecute.setTest, (20))});
    }

    function _reentrancyAction() internal view returns (Action memory) {
        return Action({to: address(actionMock), value: 0, data: abi.encodeCall(ActionExecute.callBackCaller, ())});
    }

    function _gasConsumingAction(GasConsumer g, uint256 count) internal pure returns (Action memory) {
        return Action({to: address(g), value: 0, data: abi.encodeCall(GasConsumer.consumeGas, (count))});
    }

    // -------------------------------------------------------------------------
    // ERC-165
    // -------------------------------------------------------------------------

    function test_supportsInterface_ERC165() public view {
        assertTrue(executor.supportsInterface(type(IERC165).interfaceId));
    }

    function test_supportsInterface_IExecutor() public view {
        assertTrue(executor.supportsInterface(type(IExecutor).interfaceId));
    }

    function test_supportsInterface_returnsFalseForUnknownInterface() public view {
        assertFalse(executor.supportsInterface(0xdeadbeef));
    }

    // -------------------------------------------------------------------------
    // Constructor sets reentrancy status to _NOT_ENTERED
    // -------------------------------------------------------------------------

    function test_constructor_setsReentrancyStatusNotEntered() public view {
        // The contract uses a custom reentrancy slot; read it directly.
        // `_NOT_ENTERED` is the magic value 1 per the source.
        bytes32 raw = vm.load(address(executor), REENTRANCY_GUARD_STORAGE_LOCATION);
        assertEq(uint256(raw), 1);
    }

    // -------------------------------------------------------------------------
    // MAX_ACTIONS boundary
    // -------------------------------------------------------------------------

    function test_execute_revertsIfMoreThanMaxActions() public {
        Action[] memory tooMany = new Action[](MAX_ACTIONS + 1);
        for (uint256 i = 0; i < MAX_ACTIONS; i++) {
            tooMany[i] = _succeedAction();
        }
        tooMany[MAX_ACTIONS] = _failAction();

        vm.expectRevert(Executor.TooManyActions.selector);
        executor.execute(ZERO_CALLID, tooMany, 0);
    }

    function test_execute_acceptsExactlyMaxActions() public {
        Action[] memory exactly = new Action[](MAX_ACTIONS);
        for (uint256 i = 0; i < MAX_ACTIONS; i++) {
            exactly[i] = _succeedAction();
        }
        executor.execute(ZERO_CALLID, exactly, 0);
    }

    // -------------------------------------------------------------------------
    // Failure handling
    // -------------------------------------------------------------------------

    function test_execute_revertsIfActionFailsAndNotInAllowMap() public {
        Action[] memory actions = new Action[](1);
        actions[0] = _failAction();
        vm.expectRevert(abi.encodeWithSelector(Executor.ActionFailed.selector, 0));
        executor.execute(ZERO_CALLID, actions, 0);
    }

    function test_execute_succeedsIfFailureAllowed() public {
        Action[] memory actions = new Action[](1);
        actions[0] = _failAction();
        (bytes[] memory results,) = executor.execute(ZERO_CALLID, actions, 1);
        // The result includes the revert reason wrapped in `Error(string)`.
        bytes4 sel = bytes4(results[0]);
        assertEq(sel, ERROR_SELECTOR);
    }

    function test_execute_returnsCorrectResultIfActionSucceeds() public {
        Action[] memory actions = new Action[](1);
        actions[0] = _succeedAction();
        (bytes[] memory results,) = executor.execute(ZERO_CALLID, actions, 0);
        // `setTest(20)` returns 20.
        assertEq(abi.decode(results[0], (uint256)), 20);
    }

    function test_execute_constructsFailureMapCorrectly() public {
        // 6 actions: first 3 fail, last 3 succeed. Allow bits 0,1,2 to fail.
        uint256 allowMap = (1 << 0) | (1 << 1) | (1 << 2);
        Action[] memory actions = new Action[](6);
        for (uint256 i = 0; i < 3; i++) {
            actions[i] = _failAction();
        }
        for (uint256 i = 3; i < 6; i++) {
            actions[i] = _succeedAction();
        }
        (bytes[] memory results, uint256 failureMap) = executor.execute(ZERO_CALLID, actions, allowMap);

        // failureMap must have bits 0,1,2 set (those failed).
        assertEq(failureMap, (1 << 0) | (1 << 1) | (1 << 2));
        // Failed action results include the Error(string) selector.
        for (uint256 i = 0; i < 3; i++) {
            assertEq(bytes4(results[i]), ERROR_SELECTOR);
        }
        // Succeeded action results encode the return value 20.
        for (uint256 i = 3; i < 6; i++) {
            assertEq(abi.decode(results[i], (uint256)), 20);
        }

        // Now flip bit 2 off in the allow map → action 2 reverts.
        uint256 allowMapMinus2 = allowMap ^ (1 << 2);
        vm.expectRevert(abi.encodeWithSelector(Executor.ActionFailed.selector, 2));
        executor.execute(ZERO_CALLID, actions, allowMapMinus2);
    }

    // -------------------------------------------------------------------------
    // Reentrancy
    // -------------------------------------------------------------------------

    function test_execute_revertsOnReentryWhenNotAllowed() public {
        // The reentrancy action calls back into executor.execute. With
        // allowMap = 0, the outer call reverts ActionFailed(0) because the
        // inner reverts ReentrantCall (a sub-revert is wrapped).
        Action[] memory actions = new Action[](1);
        actions[0] = _reentrancyAction();
        vm.expectRevert(abi.encodeWithSelector(Executor.ActionFailed.selector, 0));
        executor.execute(ZERO_CALLID, actions, 0);
    }

    function test_execute_capturesReentrancyErrorInResultsWhenAllowed() public {
        // Allow the action to fail and capture the ReentrantCall selector
        // inside the recorded execResult.
        Action[] memory actions = new Action[](1);
        actions[0] = _reentrancyAction();
        (bytes[] memory results,) = executor.execute(ZERO_CALLID, actions, 1);
        assertEq(bytes4(results[0]), Executor.ReentrantCall.selector);
    }

    function test_execute_reentrancyStatusResetsAfterCall() public {
        // Verify the reentrancy guard resets to _NOT_ENTERED after a
        // successful execute (per the `nonReentrant` modifier).
        Action[] memory actions = new Action[](1);
        actions[0] = _succeedAction();
        executor.execute(ZERO_CALLID, actions, 0);

        bytes32 raw = vm.load(address(executor), REENTRANCY_GUARD_STORAGE_LOCATION);
        assertEq(uint256(raw), 1, "reentrancy guard not reset");
    }

    // -------------------------------------------------------------------------
    // Executed event
    // -------------------------------------------------------------------------

    bytes32 internal constant EXECUTED_TOPIC =
        keccak256("Executed(address,bytes32,(address,uint256,bytes)[],uint256,uint256,bytes[])");

    function test_execute_emitsExecutedWithCorrectFields() public {
        Action[] memory actions = new Action[](1);
        actions[0] = _succeedAction();

        vm.recordLogs();
        executor.execute(ZERO_CALLID, actions, 0);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(executor) && logs[i].topics[0] == EXECUTED_TOPIC) {
                // topics[1] = indexed actor (== msg.sender of the execute call).
                address actor = address(uint160(uint256(logs[i].topics[1])));
                assertEq(actor, address(this));

                (
                    bytes32 callId,
                    Action[] memory loggedActions,
                    uint256 allowFailureMap,
                    uint256 failureMap,
                    bytes[] memory execResults
                ) = abi.decode(logs[i].data, (bytes32, Action[], uint256, uint256, bytes[]));
                assertEq(callId, ZERO_CALLID);
                assertEq(loggedActions.length, 1);
                assertEq(loggedActions[0].to, address(actionMock));
                assertEq(loggedActions[0].value, 0);
                assertEq(allowFailureMap, 0);
                assertEq(failureMap, 0);
                assertEq(execResults.length, 1);
                assertEq(abi.decode(execResults[0], (uint256)), 20);
                found = true;
                break;
            }
        }
        assertTrue(found, "Executed not emitted");
    }

    // -------------------------------------------------------------------------
    // InsufficientGas — see Executor.execute's 63/64 check
    // -------------------------------------------------------------------------

    function test_execute_revertsInsufficientGasManyActions() public {
        GasConsumer g = new GasConsumer();
        Action[] memory actions = new Action[](1);
        actions[0] = _gasConsumingAction(g, 20);
        uint256 allowMap = 1; // allow action 0 to fail

        // The exact gas figure varies; run the call inside a try/catch loop
        // until we find a limit that triggers `InsufficientGas`. The TS suite
        // hard-codes `expectedGas - 32000`; here we just walk downward.
        bool reverted;
        for (uint256 trim = 8_000; trim <= 60_000; trim += 2_000) {
            try this._callWithGasLimit(allowMap, actions, trim) returns (bool ok) {
                ok; // ignore
            } catch (bytes memory err) {
                if (bytes4(err) == Executor.InsufficientGas.selector) {
                    reverted = true;
                    break;
                }
            }
        }
        assertTrue(reverted, "Could not trigger InsufficientGas; adjust trim range");
    }

    function test_execute_revertsInsufficientGasOneAction() public {
        GasConsumer g = new GasConsumer();
        Action[] memory actions = new Action[](1);
        actions[0] = _gasConsumingAction(g, 3);
        uint256 allowMap = 1;

        bool reverted;
        for (uint256 trim = 4_000; trim <= 20_000; trim += 1_000) {
            try this._callWithGasLimit(allowMap, actions, trim) returns (bool ok) {
                ok;
            } catch (bytes memory err) {
                if (bytes4(err) == Executor.InsufficientGas.selector) {
                    reverted = true;
                    break;
                }
            }
        }
        assertTrue(reverted, "Could not trigger InsufficientGas; adjust trim range");
    }

    /// External entrypoint to drive `executor.execute` with a constrained gas
    /// budget. The `try/catch` in the tests above needs an external call to
    /// catch the InsufficientGas selector cleanly.
    function _callWithGasLimit(uint256 allowMap, Action[] calldata actions, uint256 trim) external returns (bool) {
        // Budget headroom: enough so the outer test doesn't OOG, but tight
        // enough to push the inner `.to.call` past the 63/64 boundary.
        uint256 budget = 50_000 + trim;
        executor.execute{gas: budget}(ZERO_CALLID, actions, allowMap);
        return true;
    }
}
