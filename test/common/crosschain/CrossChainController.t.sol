// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {CrossChainController} from "../../../src/common/crosschain/CrossChainController.sol";
import {Errors} from "../../../src/common/crosschain/lib/Errors.sol";
import {Action} from "../../../src/common/executors/IExecutor.sol";
import {DaoUnauthorized} from "../../../src/common/permission/auth/auth.sol";
import {AdapterMock} from "../../mocks/commons/crosschain/AdapterMock.sol";
import {CrossChainControllerDAOMock} from "../../mocks/commons/crosschain/CrossChainControllerDAOMock.sol";
import {ERC20Mock} from "../../mocks/commons/token/ERC20Mock.sol";
import {ActionExecute} from "../../mocks/commons/executors/ActionExecute.sol";

/// @notice Regression suite for the hardened `CrossChainController`
///         (`src/common/crosschain/CrossChainController.sol`).
///
/// Every test here targets a specific finding from the security review and is
/// written to genuinely FAIL against the pre-hardening version of the
/// contract:
///  - `receiveMessage` inbound authentication (only a registered local
///    adapter may call it) and correct refcounted adapter rotation.
///  - `updateConfig` input validation (length mismatch, chain id 0,
///    half-configured lanes) and its `ConfigUpdated` event payload.
///  - The "silent no-op" footgun: `forwardMessage` to an unconfigured chain
///    or to a codeless local adapter must revert, not silently succeed.
///  - Fee custody: exact fee amounts moved for both ERC20 and native, and
///    `INSUFFICIENT_FEE_BALANCE` when underfunded.
///  - The defensive `try/catch` around inbound execution: a reverting or
///    malformed payload is captured as a `FailedMessage` instead of
///    reverting message delivery, and can later be retried.
///  - `executeActions`'s `CALLER_NOT_SELF` self-call guard.
///  - `sweep`'s auth check and zero-address guard.
///  - `deriveCallId` determinism.
contract CrossChainControllerTest is Test {
    // Solc 0.8.17 (this repo's pinned version) cannot `emit Contract.Event(...)`
    // for an externally-defined event, so the events under test are
    // redeclared here with identical signatures purely so `vm.expectEmit`
    // has something to match topics/data against (topic0 only depends on the
    // signature, not on which contract declares it).
    event ConfigUpdated(uint256 indexed chainId, address localAdapter, address remoteAdapter);
    event MessageForwarded(
        uint256 indexed destinationChainId,
        bytes32 indexed messageId,
        address indexed localAdapter,
        address remoteAdapter,
        uint256 gasLimit,
        address feeToken,
        uint256 fee
    );
    event MessageExecutionFailed(
        uint256 indexed originChainId, bytes32 indexed messageId, bytes32 indexed callId, bytes reason
    );
    event MessageRetried(bytes32 indexed callId);
    event Swept(address indexed token, address indexed to, uint256 amount);

    uint256 internal constant CHAIN_ID = 10;
    uint256 internal constant OTHER_CHAIN_ID = 20;
    uint256 internal constant GAS_LIMIT = 200_000;

    CrossChainControllerDAOMock internal daoMock;
    CrossChainController internal controller;
    AdapterMock internal adapterA;
    AdapterMock internal adapterB;
    ERC20Mock internal feeToken;
    ActionExecute internal actionTarget;

    address internal remoteAdapterA;
    address internal remoteAdapterB;
    address internal alice; // holds every permission
    address internal bob; // holds none

    bytes32 internal FORWARD_MESSAGE_PERMISSION_ID;
    bytes32 internal UPDATE_CONFIG_PERMISSION_ID;
    bytes32 internal RETRY_MESSAGE_PERMISSION_ID;
    bytes32 internal SWEEP_PERMISSION_ID;

    function setUp() public {
        daoMock = new CrossChainControllerDAOMock();
        controller = new CrossChainController(address(daoMock));

        adapterA = new AdapterMock(address(controller));
        adapterB = new AdapterMock(address(controller));
        feeToken = new ERC20Mock("Fee", "FEE");
        actionTarget = new ActionExecute();

        remoteAdapterA = makeAddr("remoteAdapterA");
        remoteAdapterB = makeAddr("remoteAdapterB");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        FORWARD_MESSAGE_PERMISSION_ID = controller.FORWARD_MESSAGE_PERMISSION_ID();
        UPDATE_CONFIG_PERMISSION_ID = controller.UPDATE_CONFIG_PERMISSION_ID();
        RETRY_MESSAGE_PERMISSION_ID = controller.RETRY_MESSAGE_PERMISSION_ID();
        SWEEP_PERMISSION_ID = controller.SWEEP_PERMISSION_ID();

        daoMock.setHasPermission(address(controller), alice, FORWARD_MESSAGE_PERMISSION_ID, true);
        daoMock.setHasPermission(address(controller), alice, UPDATE_CONFIG_PERMISSION_ID, true);
        daoMock.setHasPermission(address(controller), alice, RETRY_MESSAGE_PERMISSION_ID, true);
        daoMock.setHasPermission(address(controller), alice, SWEEP_PERMISSION_ID, true);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    function _lane(address _local, address _remote) internal pure returns (CrossChainController.AdapterByChain memory) {
        return CrossChainController.AdapterByChain({localAdapter: _local, remoteAdapter: _remote});
    }

    function _configureLane(uint256 _chainId, address _local, address _remote) internal {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = _chainId;
        CrossChainController.AdapterByChain[] memory adapters = new CrossChainController.AdapterByChain[](1);
        adapters[0] = _lane(_local, _remote);

        vm.prank(alice);
        controller.updateConfig(chainIds, adapters);
    }

    function _emptyActionsPayload() internal pure returns (bytes memory) {
        return abi.encode(new Action[](0));
    }

    // -------------------------------------------------------------------------
    // a) receiveMessage inbound authentication
    // -------------------------------------------------------------------------

    function test_receiveMessage_revertsForCallerNotLocalAdapter() public {
        address random = makeAddr("random");
        vm.expectRevert(abi.encodeWithSelector(Errors.CALLER_NOT_LOCAL_ADAPTER.selector, random));
        vm.prank(random);
        controller.receiveMessage(bytes32(uint256(1)), _emptyActionsPayload(), CHAIN_ID);
    }

    function test_receiveMessage_revertsForUnregisteredContract() public {
        // A deployed contract that was never configured as a lane's local
        // adapter is just as unauthorized as an EOA.
        AdapterMock strangerAdapter = new AdapterMock(address(controller));
        vm.expectRevert(abi.encodeWithSelector(Errors.CALLER_NOT_LOCAL_ADAPTER.selector, address(strangerAdapter)));
        vm.prank(address(strangerAdapter));
        controller.receiveMessage(bytes32(uint256(1)), _emptyActionsPayload(), CHAIN_ID);
    }

    function test_receiveMessage_succeedsForRegisteredLocalAdapter() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);

        bytes32 messageId = bytes32(uint256(42));
        vm.prank(address(adapterA));
        bytes32 callId = controller.receiveMessage(messageId, _emptyActionsPayload(), CHAIN_ID);

        assertEq(callId, controller.deriveCallId(CHAIN_ID, messageId));
    }

    function test_receiveMessage_revertsIfMessageAlreadyPending() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);

        Action[] memory actions = new Action[](1);
        actions[0] = Action({to: address(actionTarget), value: 0, data: abi.encodeCall(ActionExecute.fail, ())});
        bytes memory payload = abi.encode(actions);

        bytes32 messageId = bytes32(uint256(7));
        bytes32 callId = controller.deriveCallId(CHAIN_ID, messageId);

        vm.prank(address(adapterA));
        controller.receiveMessage(messageId, payload, CHAIN_ID);
        assertTrue(controller.getFailedMessage(callId).pending);

        // Redelivering the same (originChainId, messageId) while the first
        // attempt is still pending must revert, not overwrite/duplicate it.
        vm.expectRevert(abi.encodeWithSelector(Errors.MESSAGE_ALREADY_PENDING.selector, callId));
        vm.prank(address(adapterA));
        controller.receiveMessage(messageId, payload, CHAIN_ID);
    }

    // -------------------------------------------------------------------------
    // b) Adapter rotation / refcounting
    // -------------------------------------------------------------------------

    function test_updateConfig_rotatingLocalAdapterRevokesOldAdapter() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);

        vm.prank(address(adapterA));
        controller.receiveMessage(bytes32(uint256(1)), _emptyActionsPayload(), CHAIN_ID);

        // Rotate the lane to adapterB.
        _configureLane(CHAIN_ID, address(adapterB), remoteAdapterB);

        assertFalse(controller.isRegisteredLocalAdapter(address(adapterA)));
        assertEq(controller.localAdapterLaneCount(address(adapterA)), 0);

        vm.expectRevert(abi.encodeWithSelector(Errors.CALLER_NOT_LOCAL_ADAPTER.selector, address(adapterA)));
        vm.prank(address(adapterA));
        controller.receiveMessage(bytes32(uint256(2)), _emptyActionsPayload(), CHAIN_ID);

        // The new adapter works.
        vm.prank(address(adapterB));
        controller.receiveMessage(bytes32(uint256(3)), _emptyActionsPayload(), CHAIN_ID);
    }

    function test_updateConfig_refcountKeepsAdapterAuthorizedUntilBothLanesCleared() public {
        // adapterA serves two lanes.
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);
        _configureLane(OTHER_CHAIN_ID, address(adapterA), remoteAdapterB);

        assertEq(controller.localAdapterLaneCount(address(adapterA)), 2);
        assertTrue(controller.isRegisteredLocalAdapter(address(adapterA)));

        // Clear the first lane only; adapterA must remain authorized.
        _configureLane(CHAIN_ID, address(0), address(0));

        assertEq(controller.localAdapterLaneCount(address(adapterA)), 1);
        assertTrue(controller.isRegisteredLocalAdapter(address(adapterA)));

        vm.prank(address(adapterA));
        controller.receiveMessage(bytes32(uint256(1)), _emptyActionsPayload(), OTHER_CHAIN_ID);

        // Clear the second (last) lane; adapterA now loses authorization.
        _configureLane(OTHER_CHAIN_ID, address(0), address(0));

        assertEq(controller.localAdapterLaneCount(address(adapterA)), 0);
        assertFalse(controller.isRegisteredLocalAdapter(address(adapterA)));

        vm.expectRevert(abi.encodeWithSelector(Errors.CALLER_NOT_LOCAL_ADAPTER.selector, address(adapterA)));
        vm.prank(address(adapterA));
        controller.receiveMessage(bytes32(uint256(2)), _emptyActionsPayload(), OTHER_CHAIN_ID);
    }

    function test_updateConfig_clearingLaneWithZeroPairResetsMapping() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);
        _configureLane(CHAIN_ID, address(0), address(0));

        (address local, address remote) = controller.chainToAdapter(CHAIN_ID);
        assertEq(local, address(0));
        assertEq(remote, address(0));

        // A cleared lane is "unconfigured" again for sends.
        vm.expectRevert(abi.encodeWithSelector(Errors.ADAPTER_NOT_CONFIGURED.selector, CHAIN_ID));
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    // -------------------------------------------------------------------------
    // c) updateConfig validation
    // -------------------------------------------------------------------------

    function test_updateConfig_revertsOnLengthMismatch() public {
        uint256[] memory chainIds = new uint256[](2);
        chainIds[0] = CHAIN_ID;
        chainIds[1] = OTHER_CHAIN_ID;
        CrossChainController.AdapterByChain[] memory adapters = new CrossChainController.AdapterByChain[](1);
        adapters[0] = _lane(address(adapterA), remoteAdapterA);

        vm.expectRevert(Errors.INVALID_LENGTH_MISMATCH.selector);
        vm.prank(alice);
        controller.updateConfig(chainIds, adapters);
    }

    function test_updateConfig_revertsOnZeroChainId() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = 0;
        CrossChainController.AdapterByChain[] memory adapters = new CrossChainController.AdapterByChain[](1);
        adapters[0] = _lane(address(adapterA), remoteAdapterA);

        vm.expectRevert(Errors.INVALID_CHAIN_ID.selector);
        vm.prank(alice);
        controller.updateConfig(chainIds, adapters);
    }

    function test_updateConfig_revertsOnHalfConfiguredLane_missingRemote() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = CHAIN_ID;
        CrossChainController.AdapterByChain[] memory adapters = new CrossChainController.AdapterByChain[](1);
        adapters[0] = _lane(address(adapterA), address(0));

        vm.expectRevert(abi.encodeWithSelector(Errors.INCOMPLETE_ADAPTER_CONFIG.selector, CHAIN_ID));
        vm.prank(alice);
        controller.updateConfig(chainIds, adapters);
    }

    function test_updateConfig_revertsOnHalfConfiguredLane_missingLocal() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = CHAIN_ID;
        CrossChainController.AdapterByChain[] memory adapters = new CrossChainController.AdapterByChain[](1);
        adapters[0] = _lane(address(0), remoteAdapterA);

        vm.expectRevert(abi.encodeWithSelector(Errors.INCOMPLETE_ADAPTER_CONFIG.selector, CHAIN_ID));
        vm.prank(alice);
        controller.updateConfig(chainIds, adapters);
    }

    function test_updateConfig_revertsIfCallerUnauthorized() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = CHAIN_ID;
        CrossChainController.AdapterByChain[] memory adapters = new CrossChainController.AdapterByChain[](1);
        adapters[0] = _lane(address(adapterA), remoteAdapterA);

        vm.expectRevert(
            abi.encodeWithSelector(DaoUnauthorized.selector, address(daoMock), address(controller), bob, UPDATE_CONFIG_PERMISSION_ID)
        );
        vm.prank(bob);
        controller.updateConfig(chainIds, adapters);
    }

    function test_updateConfig_emitsConfigUpdatedWithCorrectPayload() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = CHAIN_ID;
        CrossChainController.AdapterByChain[] memory adapters = new CrossChainController.AdapterByChain[](1);
        adapters[0] = _lane(address(adapterA), remoteAdapterA);

        vm.expectEmit(true, false, false, true, address(controller));
        emit ConfigUpdated(CHAIN_ID, address(adapterA), remoteAdapterA);

        vm.prank(alice);
        controller.updateConfig(chainIds, adapters);
    }

    // -------------------------------------------------------------------------
    // d) forwardMessage silent no-op guards
    // -------------------------------------------------------------------------

    function test_forwardMessage_revertsIfChainNotConfigured() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.ADAPTER_NOT_CONFIGURED.selector, CHAIN_ID));
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    function test_forwardMessage_revertsIfLocalAdapterHasNoCode() public {
        address codelessAdapter = makeAddr("codelessAdapter");
        address codelessRemote = makeAddr("codelessRemote");
        _configureLane(CHAIN_ID, codelessAdapter, codelessRemote);

        assertEq(codelessAdapter.code.length, 0);

        vm.expectRevert(abi.encodeWithSelector(Errors.ADAPTER_HAS_NO_CODE.selector, codelessAdapter));
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    // -------------------------------------------------------------------------
    // e) forwardMessage auth + happy path
    // -------------------------------------------------------------------------

    function test_forwardMessage_revertsIfCallerUnauthorized() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);

        vm.expectRevert(
            abi.encodeWithSelector(DaoUnauthorized.selector, address(daoMock), address(controller), bob, FORWARD_MESSAGE_PERMISSION_ID)
        );
        vm.prank(bob);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    function test_forwardMessage_happyPathEmitsMessageForwardedAndReturnsMessageId() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);
        adapterA.setFee(address(0), 0); // no fee due, no funding required
        bytes32 expectedMessageId = bytes32(uint256(999));
        adapterA.setMessageId(expectedMessageId);

        bytes memory message = abi.encode("hello");

        vm.expectEmit(true, true, true, true, address(controller));
        emit MessageForwarded(
            CHAIN_ID, expectedMessageId, address(adapterA), remoteAdapterA, GAS_LIMIT, address(0), 0
        );

        vm.prank(alice);
        bytes32 messageId = controller.forwardMessage(CHAIN_ID, GAS_LIMIT, message);

        assertEq(messageId, expectedMessageId);
        assertEq(adapterA.lastReceiver(), remoteAdapterA);
        assertEq(adapterA.lastGasLimit(), GAS_LIMIT);
        assertEq(adapterA.lastDestinationChainId(), CHAIN_ID);
        assertEq(adapterA.lastMessage(), message);
        assertEq(adapterA.sendMessageCallCount(), 1);
    }

    // -------------------------------------------------------------------------
    // f) Fees
    // -------------------------------------------------------------------------

    function test_forwardMessage_erc20Fee_revertsIfControllerBalanceInsufficient() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);
        adapterA.setFee(address(feeToken), 100 ether);
        // Controller holds 0 of feeToken.

        vm.expectRevert(abi.encodeWithSelector(Errors.INSUFFICIENT_FEE_BALANCE.selector, address(feeToken), 100 ether, 0));
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    function test_forwardMessage_erc20Fee_transfersExactFeeToAdapterWhenFunded() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);
        uint256 requiredFee = 100 ether;
        adapterA.setFee(address(feeToken), requiredFee);
        feeToken.setBalance(address(controller), requiredFee + 1 ether); // extra buffer left untouched

        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());

        assertEq(feeToken.balanceOf(address(adapterA)), requiredFee);
        assertEq(feeToken.balanceOf(address(controller)), 1 ether);
    }

    function test_forwardMessage_nativeFee_revertsIfControllerBalanceInsufficient() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);
        adapterA.setFee(address(0), 1 ether);
        // Controller holds 0 native.

        vm.expectRevert(abi.encodeWithSelector(Errors.INSUFFICIENT_FEE_BALANCE.selector, address(0), 1 ether, 0));
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    function test_forwardMessage_nativeFee_forwardsExactFeeWeiToAdapterWhenFunded() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);
        uint256 requiredFee = 1 ether;
        adapterA.setFee(address(0), requiredFee);
        vm.deal(address(controller), requiredFee + 3 ether);

        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());

        assertEq(address(adapterA).balance, requiredFee);
        assertEq(address(controller).balance, 3 ether);
        assertEq(adapterA.lastValueReceived(), requiredFee);
    }

    // -------------------------------------------------------------------------
    // g) Defensive receive / retry
    // -------------------------------------------------------------------------

    function test_receiveMessage_capturesRevertingPayloadInsteadOfReverting() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);

        Action[] memory actions = new Action[](1);
        actions[0] = Action({to: address(actionTarget), value: 0, data: abi.encodeCall(ActionExecute.fail, ())});
        bytes memory payload = abi.encode(actions);

        bytes32 messageId = bytes32(uint256(55));
        bytes32 expectedCallId = controller.deriveCallId(CHAIN_ID, messageId);
        // `CrossChainControllerDAOMock.execute` bubbles the low-level call's
        // raw returndata on failure, which is `ActionExecute.fail`'s
        // `Error(string)`-encoded revert reason.
        bytes memory expectedReason = abi.encodeWithSignature("Error(string)", "ActionExecute:Revert");

        vm.expectEmit(true, true, true, true, address(controller));
        emit MessageExecutionFailed(CHAIN_ID, messageId, expectedCallId, expectedReason);

        vm.prank(address(adapterA));
        bytes32 callId = controller.receiveMessage(messageId, payload, CHAIN_ID); // must NOT revert
        assertEq(callId, expectedCallId);

        CrossChainController.FailedMessage memory failed = controller.getFailedMessage(callId);
        assertTrue(failed.pending);
        assertEq(failed.originChainId, CHAIN_ID);
        assertEq(failed.messageId, messageId);
        assertEq(failed.payload, payload);
    }

    function test_receiveMessage_capturesMalformedPayloadInsteadOfReverting() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);

        // Not a valid ABI-encoding of `Action[]`.
        bytes memory garbage = hex"deadbeef";

        bytes32 messageId = bytes32(uint256(56));
        bytes32 expectedCallId = controller.deriveCallId(CHAIN_ID, messageId);

        // Only check the indexed topics here (origin/message/call id); the
        // exact revert bytes produced by a failed `abi.decode` are an
        // implementation/compiler detail we don't want to pin.
        vm.expectEmit(true, true, true, false, address(controller));
        emit MessageExecutionFailed(CHAIN_ID, messageId, expectedCallId, "");

        vm.prank(address(adapterA));
        bytes32 callId = controller.receiveMessage(messageId, garbage, CHAIN_ID); // must NOT revert
        assertEq(callId, expectedCallId);
        assertTrue(controller.getFailedMessage(callId).pending);
    }

    function test_retryFailedMessage_revertsIfCallerUnauthorized() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);
        bytes32 callId = _causeFailure(bytes32(uint256(60)));

        vm.expectRevert(
            abi.encodeWithSelector(DaoUnauthorized.selector, address(daoMock), address(controller), bob, RETRY_MESSAGE_PERMISSION_ID)
        );
        vm.prank(bob);
        controller.retryFailedMessage(callId);
    }

    function test_retryFailedMessage_revertsForUnknownCallId() public {
        bytes32 unknownCallId = keccak256("nope");
        vm.expectRevert(abi.encodeWithSelector(Errors.NO_FAILED_MESSAGE.selector, unknownCallId));
        vm.prank(alice);
        controller.retryFailedMessage(unknownCallId);
    }

    function test_retryFailedMessage_succeedsOnceFailureConditionRemoved() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);

        FlakyTarget flaky = new FlakyTarget();
        Action[] memory actions = new Action[](1);
        actions[0] = Action({to: address(flaky), value: 0, data: abi.encodeCall(FlakyTarget.maybeRevert, ())});
        bytes memory payload = abi.encode(actions);

        bytes32 messageId = bytes32(uint256(61));
        bytes32 callId = controller.deriveCallId(CHAIN_ID, messageId);

        vm.prank(address(adapterA));
        controller.receiveMessage(messageId, payload, CHAIN_ID);
        assertTrue(controller.getFailedMessage(callId).pending);

        // Fix the failure condition.
        flaky.setShouldRevert(false);

        vm.expectEmit(true, false, false, false, address(controller));
        emit MessageRetried(callId);

        vm.prank(alice);
        controller.retryFailedMessage(callId);

        CrossChainController.FailedMessage memory cleared = controller.getFailedMessage(callId);
        assertFalse(cleared.pending);
        assertTrue(flaky.wasCalled());
    }

    /// @dev Delivers a message whose payload always fails, leaving a stored
    ///      `FailedMessage` at the returned call id.
    function _causeFailure(bytes32 _messageId) internal returns (bytes32 callId) {
        Action[] memory actions = new Action[](1);
        actions[0] = Action({to: address(actionTarget), value: 0, data: abi.encodeCall(ActionExecute.fail, ())});
        bytes memory payload = abi.encode(actions);

        vm.prank(address(adapterA));
        callId = controller.receiveMessage(_messageId, payload, CHAIN_ID);
    }

    // -------------------------------------------------------------------------
    // h) executeActions self-call guard
    // -------------------------------------------------------------------------

    function test_executeActions_revertsIfCallerNotSelf() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.CALLER_NOT_SELF.selector, address(this)));
        controller.executeActions(bytes32(0), _emptyActionsPayload());
    }

    // -------------------------------------------------------------------------
    // i) sweep
    // -------------------------------------------------------------------------

    function test_sweep_revertsIfCallerUnauthorized() public {
        vm.expectRevert(
            abi.encodeWithSelector(DaoUnauthorized.selector, address(daoMock), address(controller), bob, SWEEP_PERMISSION_ID)
        );
        vm.prank(bob);
        controller.sweep(address(0), bob, 1 ether);
    }

    function test_sweep_revertsIfRecipientIsZeroAddress() public {
        vm.expectRevert(Errors.ZERO_ADDRESS.selector);
        vm.prank(alice);
        controller.sweep(address(0), address(0), 0);
    }

    function test_sweep_native_movesExactAmountAndEmits() public {
        vm.deal(address(controller), 5 ether);
        address recipient = makeAddr("recipient");

        vm.expectEmit(true, true, false, true, address(controller));
        emit Swept(address(0), recipient, 2 ether);

        vm.prank(alice);
        controller.sweep(address(0), recipient, 2 ether);

        assertEq(recipient.balance, 2 ether);
        assertEq(address(controller).balance, 3 ether);
    }

    function test_sweep_erc20_movesExactAmountAndEmits() public {
        feeToken.setBalance(address(controller), 10 ether);
        address recipient = makeAddr("recipient");

        vm.expectEmit(true, true, false, true, address(controller));
        emit Swept(address(feeToken), recipient, 4 ether);

        vm.prank(alice);
        controller.sweep(address(feeToken), recipient, 4 ether);

        assertEq(feeToken.balanceOf(recipient), 4 ether);
        assertEq(feeToken.balanceOf(address(controller)), 6 ether);
    }

    // -------------------------------------------------------------------------
    // j) deriveCallId
    // -------------------------------------------------------------------------

    function test_deriveCallId_isDeterministicAndInputSensitive() public view {
        bytes32 messageId = bytes32(uint256(123));

        bytes32 callId1 = controller.deriveCallId(CHAIN_ID, messageId);
        bytes32 callId2 = controller.deriveCallId(CHAIN_ID, messageId);
        assertEq(callId1, callId2);
        assertEq(callId1, keccak256(abi.encode(CHAIN_ID, messageId)));

        bytes32 differentChain = controller.deriveCallId(OTHER_CHAIN_ID, messageId);
        assertTrue(callId1 != differentChain);

        bytes32 differentMessage = controller.deriveCallId(CHAIN_ID, bytes32(uint256(124)));
        assertTrue(callId1 != differentMessage);
    }
}

/// @dev Minimal target whose revert behaviour can be flipped on demand, used
///      to prove `retryFailedMessage` succeeds once the underlying failure
///      condition is actually fixed (as opposed to merely being re-run).
contract FlakyTarget {
    bool public shouldRevert = true;
    bool public wasCalled;

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function maybeRevert() external {
        if (shouldRevert) revert("FlakyTarget: still failing");
        wasCalled = true;
    }
}
