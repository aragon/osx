// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {CallbackHandler} from "../../../src/core/utils/CallbackHandler.sol";
import {CallbackHandlerMockHelper} from "../../mocks/dao/CallbackHandlerHelperMock.sol";

/// @notice Direct tests for `CallbackHandler` in
/// `src/core/utils/CallbackHandler.sol`.
///
/// Ports `packages/contracts/test/core/dao/callback-handler.ts` (72 lines, 3
/// cases). Adds: idempotency under repeated `_registerCallback`, state
/// isolation across distinct selectors, exact `CallbackReceived` event field
/// values, and the `UNREGISTERED_CALLBACK == bytes4(0)` constant.
contract CallbackHandlerTest is Test {
    bytes4 internal constant CALLBACK_SELECTOR = bytes4(keccak256("callbackFunc()"));
    bytes4 internal constant MAGIC_NUMBER = bytes4(0x10000000);
    bytes4 internal constant UNREGISTERED = bytes4(0);

    CallbackHandlerMockHelper internal handler;
    address internal alice;

    function setUp() public {
        alice = makeAddr("alice");
        handler = new CallbackHandlerMockHelper();
    }

    // -------------------------------------------------------------------------
    // _handleCallback
    // -------------------------------------------------------------------------

    function test_handleCallback_revertsIfNotRegistered() public {
        vm.expectRevert(
            abi.encodeWithSelector(CallbackHandler.UnknownCallback.selector, CALLBACK_SELECTOR, UNREGISTERED)
        );
        handler.handleCallback(CALLBACK_SELECTOR, "");
    }

    function test_handleCallback_returnsMagicNumberWhenRegistered() public {
        handler.registerCallback(CALLBACK_SELECTOR, MAGIC_NUMBER);
        bytes4 result = handler.handleCallback(CALLBACK_SELECTOR, "");
        assertEq(result, MAGIC_NUMBER);
    }

    function test_handleCallback_emitsCallbackReceivedWithExactFields() public {
        handler.registerCallback(CALLBACK_SELECTOR, MAGIC_NUMBER);

        bytes memory payload = hex"1111";
        vm.recordLogs();
        vm.prank(alice);
        handler.handleCallback(CALLBACK_SELECTOR, payload);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        // event CallbackReceived(address sender, bytes4 indexed sig, bytes data);
        // → topics: [keccak256(sig), sig], data: abi.encode(sender, data).
        bytes32 expectedTopic = keccak256("CallbackReceived(address,bytes4,bytes)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(handler) && logs[i].topics[0] == expectedTopic) {
                assertEq(bytes32(logs[i].topics[1]) >> 224, bytes32(CALLBACK_SELECTOR) >> 224);
                (address sender, bytes memory data) = abi.decode(logs[i].data, (address, bytes));
                assertEq(sender, alice);
                assertEq(data, payload);
                found = true;
                break;
            }
        }
        assertTrue(found, "CallbackReceived not emitted");
    }

    // -------------------------------------------------------------------------
    // _registerCallback
    // -------------------------------------------------------------------------

    function test_registerCallback_overwriteReplacesMagicNumber() public {
        // Register, then re-register with a different magic number. The second
        // call must override the first; `_handleCallback` reflects the new value.
        bytes4 newMagic = bytes4(0xAABBCCDD);
        handler.registerCallback(CALLBACK_SELECTOR, MAGIC_NUMBER);
        assertEq(handler.handleCallback(CALLBACK_SELECTOR, ""), MAGIC_NUMBER);

        handler.registerCallback(CALLBACK_SELECTOR, newMagic);
        assertEq(handler.handleCallback(CALLBACK_SELECTOR, ""), newMagic);
    }

    function test_registerCallback_unregistersWhenMagicIsZero() public {
        // Setting back to `UNREGISTERED_CALLBACK = bytes4(0)` returns the
        // selector to the "unknown" state.
        handler.registerCallback(CALLBACK_SELECTOR, MAGIC_NUMBER);
        assertEq(handler.handleCallback(CALLBACK_SELECTOR, ""), MAGIC_NUMBER);

        handler.registerCallback(CALLBACK_SELECTOR, UNREGISTERED);
        vm.expectRevert(
            abi.encodeWithSelector(CallbackHandler.UnknownCallback.selector, CALLBACK_SELECTOR, UNREGISTERED)
        );
        handler.handleCallback(CALLBACK_SELECTOR, "");
    }

    function test_registerCallback_isolatesAcrossSelectors() public {
        // Distinct selectors map to distinct magic numbers independently.
        bytes4 selA = bytes4(keccak256("aFunc()"));
        bytes4 selB = bytes4(keccak256("bFunc()"));
        bytes4 magicA = bytes4(0x11111111);
        bytes4 magicB = bytes4(0x22222222);

        handler.registerCallback(selA, magicA);
        handler.registerCallback(selB, magicB);

        assertEq(handler.handleCallback(selA, ""), magicA);
        assertEq(handler.handleCallback(selB, ""), magicB);

        // Registering a third selector does not perturb A or B.
        bytes4 selC = bytes4(keccak256("cFunc()"));
        handler.registerCallback(selC, bytes4(0x33333333));
        assertEq(handler.handleCallback(selA, ""), magicA);
        assertEq(handler.handleCallback(selB, ""), magicB);
    }

    // -------------------------------------------------------------------------
    // UNREGISTERED_CALLBACK constant
    // -------------------------------------------------------------------------

    function test_UNREGISTERED_CALLBACK_isZero() public {
        // The source uses `UNREGISTERED_CALLBACK = bytes4(0)` to detect
        // unregistered selectors. Lock that value via the revert payload that
        // `_handleCallback` emits when the selector is not registered.
        vm.expectRevert(abi.encodeWithSelector(CallbackHandler.UnknownCallback.selector, CALLBACK_SELECTOR, bytes4(0)));
        handler.handleCallback(CALLBACK_SELECTOR, "");
    }
}
