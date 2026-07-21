// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Vm} from "forge-std/Test.sol";

import {DAO} from "../../../src/core/dao/DAO.sol";
import {PermissionManager} from "../../../src/core/permission/PermissionManager.sol";
import {DaoUnauthorized} from "../../../src/common/permission/auth/auth.sol";
import {Action} from "../../../src/common/executors/IExecutor.sol";
import {CrossChainController} from "../../../src/common/crosschain/CrossChainController.sol";
import {CCIPAdapter} from "../../../src/common/crosschain/adapters/CCIP/CCIPAdapter.sol";
import {Errors} from "../../../src/common/crosschain/lib/Errors.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

import {CCIPRelayRouterMock} from "../../mocks/commons/crosschain/CCIPRelayRouterMock.sol";
import {CrossChainStackFixture} from "./CrossChainStackFixture.sol";

/// @dev Stand-in for the remote contract a cross-chain governance action
///      ultimately calls (in the Makina design, a Caliber's
///      `cancelAllowedInstrRootUpdate`). State here is what the round-trip
///      tests assert on: an event proves a message moved, only STATE proves the
///      whole chain of permissions actually let the action land.
contract GuardedTarget {
    /// @notice Number of successful `cancelRootUpdate` calls.
    uint256 public cancelCount;

    /// @notice The last caller that successfully cancelled.
    address public lastCaller;

    /// @notice When true, `cancelRootUpdate` reverts. Used to drive the
    ///         failed-message/retry path with a realistic, fixable cause.
    bool public locked;

    /// @notice Thrown while `locked`.
    error TargetLocked();

    function setLocked(bool _locked) external {
        locked = _locked;
    }

    function cancelRootUpdate() external {
        if (locked) revert TargetLocked();
        cancelCount++;
        lastCaller = msg.sender;
    }
}

/// @notice End-to-end, both-ends-in-one-process integration test of the
///         cross-chain module against REAL OSx `DAO`s and a real
///         `PermissionManager`.
/// @dev WHAT THIS ADDS OVER THE EXISTING SUITES. `test/common/crosschain/*`
///      tests each side alone against `CrossChainControllerDAOMock`, whose
///      `hasPermission` is a settable mapping — so no test ever proved that a
///      real GRANT is what makes the flow work, nor that a REVOKE is what
///      breaks it, nor that the two ends agree on the trusted-remote /
///      remote-adapter asymmetry that `delegatecall` sending forces on this
///      design.
///
///      Topology under test (origin = "Ethereum" id 1, destination = "Base"
///      id 8453; the ids are pure configuration keys here, `block.chainid` is
///      never consulted by the module):
///
///        daoA --execute--> controllerA --delegatecall--> adapterA code
///                                 |
///                                 +--> routerA.ccipSend  (sender = controllerA)
///                                            |
///                                       [relay]
///                                            v
///                       routerB --ccipReceive--> adapterB (trusts controllerA)
///                                            |
///                       controllerB.receiveMessage --> daoB.execute(Action[])
///                                            |
///                                            v
///                                       GuardedTarget
contract CrossChainRoundTripTest is CrossChainStackFixture {
    // Standard chain ids used as configuration keys.
    uint256 internal constant CHAIN_A = 1; // Ethereum
    uint256 internal constant CHAIN_B = 8453; // Base
    uint256 internal constant CHAIN_UNKNOWN = 42161; // Arbitrum, never configured

    // Real CCIP selectors, so the configuration under test is the real one.
    uint64 internal constant SELECTOR_A = 5009297550715157269;
    uint64 internal constant SELECTOR_B = 15971525489660198786;
    uint64 internal constant SELECTOR_UNKNOWN = 4949039107694359620;

    uint256 internal constant GAS_LIMIT = 400_000;
    uint256 internal constant FEE = 0.01 ether;

    Stack internal a;
    Stack internal b;

    CCIPRelayRouterMock internal routerA;
    CCIPRelayRouterMock internal routerB;

    GuardedTarget internal targetB;
    GuardedTarget internal targetA;

    /// @dev Stands in for the governance plugin holding `EXECUTE_PERMISSION`
    ///      on the origin DAO (LockToVote in the production design).
    address internal plugin = makeAddr("governancePlugin");

    address internal stranger = makeAddr("stranger");

    function setUp() public {
        routerA = new CCIPRelayRouterMock(SELECTOR_A);
        routerB = new CCIPRelayRouterMock(SELECTOR_B);
        routerA.setFee(FEE);
        routerB.setFee(FEE);
        routerA.setPeer(SELECTOR_B, routerB);
        routerB.setPeer(SELECTOR_A, routerA);
        vm.label(address(routerA), "RouterA");
        vm.label(address(routerB), "RouterB");

        // Both adapters know both chains' selectors. Trusted remotes are left
        // empty at construction: the remote CONTROLLER address is not knowable
        // until the far side is deployed, so it is set in phase two below.
        a = _deployStack(
            _deployDao("DAO_A"),
            address(routerA),
            address(0),
            new uint256[](0),
            new address[](0),
            _uint256s(CHAIN_A, CHAIN_B),
            _uint64s(SELECTOR_A, SELECTOR_B)
        );
        b = _deployStack(
            _deployDao("DAO_B"),
            address(routerB),
            address(0),
            new uint256[](0),
            new address[](0),
            _uint256s(CHAIN_A, CHAIN_B),
            _uint64s(SELECTOR_A, SELECTOR_B)
        );

        vm.label(address(a.controller), "ControllerA");
        vm.label(address(a.adapter), "AdapterA");
        vm.label(address(b.controller), "ControllerB");
        vm.label(address(b.adapter), "AdapterB");

        // Origin: the plugin proposes, the DAO forwards.
        a.dao.grant(address(a.dao), plugin, EXECUTE_PERMISSION_ID);
        _grantStackPermissions(a, address(a.dao));
        _grantStackPermissions(b, address(b.dao));
        b.dao.grant(address(b.dao), plugin, EXECUTE_PERMISSION_ID);

        // Phase two: lanes and trusted remotes, in BOTH directions.
        //
        // Note the asymmetry that the whole design hinges on:
        //   - the controller's lane config points at the remote ADAPTER, which
        //     is the address CCIP delivers to;
        //   - the adapter's trusted remote is the remote CONTROLLER, because
        //     under `delegatecall` the controller is the account that called
        //     the remote router.
        _configureLane(a, CHAIN_B, address(b.adapter), SELECTOR_B);
        _configureLane(b, CHAIN_A, address(a.adapter), SELECTOR_A);
        _setTrustedRemote(a, CHAIN_B, address(b.controller));
        _setTrustedRemote(b, CHAIN_A, address(a.controller));

        // Fee pre-funding lives on the CONTROLLER, which is the account that
        // pays under `delegatecall`.
        vm.deal(address(a.controller), 10 ether);
        vm.deal(address(b.controller), 10 ether);

        targetB = new GuardedTarget();
        targetA = new GuardedTarget();
        vm.label(address(targetB), "TargetB");
        vm.label(address(targetA), "TargetA");
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /// @dev The payload a proposal would carry: the encoded destination actions.
    function _cancelPayload(GuardedTarget _target) internal pure returns (bytes memory) {
        Action[] memory actions = new Action[](1);
        actions[0] =
            Action({to: address(_target), value: 0, data: abi.encodeCall(GuardedTarget.cancelRootUpdate, ())});
        return abi.encode(actions);
    }

    /// @dev Runs the origin half: the plugin makes the origin DAO execute a
    ///      single action calling `forwardMessage`. This is the production
    ///      call path — nothing here is pranked into place.
    function _proposeAndForward(bytes32 _callId, uint256 _destinationChainId, bytes memory _payload) internal {
        Action[] memory proposalActions = new Action[](1);
        proposalActions[0] = Action({
            to: address(a.controller),
            value: 0,
            data: abi.encodeCall(CrossChainController.forwardMessage, (_destinationChainId, GAS_LIMIT, _payload))
        });

        vm.prank(plugin);
        a.dao.execute(_callId, proposalActions, 0);
    }

    /// @dev Forges an inbound delivery straight at the destination adapter,
    ///      impersonating the destination router. Used for the negative
    ///      authentication cases, which by definition cannot be produced by a
    ///      correctly configured origin.
    function _forgeDelivery(bytes32 _messageId, uint64 _sourceSelector, address _sender, bytes memory _data)
        internal
    {
        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: _messageId,
            sourceChainSelector: _sourceSelector,
            sender: abi.encode(_sender),
            data: _data,
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        vm.prank(address(routerB));
        b.adapter.ccipReceive(message);
    }

    // -------------------------------------------------------------------------
    // Happy path
    // -------------------------------------------------------------------------

    function test_roundTrip_originProposalExecutesActionOnDestinationDao() public {
        assertEq(targetB.cancelCount(), 0, "precondition");

        _proposeAndForward(keccak256("proposal-1"), CHAIN_B, _cancelPayload(targetB));

        // The bridge must have seen the CONTROLLER as the sender and the remote
        // ADAPTER as the receiver. This is the single most consequential
        // property of the `delegatecall` send path.
        assertEq(routerA.sentCount(), 1, "one message queued");
        CCIPRelayRouterMock.SentMessage memory sent = routerA.sentAt(0);
        assertEq(sent.sender, address(a.controller), "bridge sender is the origin CONTROLLER");
        assertEq(sent.receiver, address(b.adapter), "bridge receiver is the remote ADAPTER");
        assertEq(sent.destinationChainSelector, SELECTOR_B, "destination selector");
        assertEq(sent.fee, FEE, "fee charged");
        assertEq(sent.feeToken, address(0), "native fee token");

        // extraArgs must be the V2 tag carrying the requested gas limit; a
        // silently-defaulted 200k limit would strand real messages.
        assertEq(
            keccak256(sent.extraArgs),
            keccak256(
                Client._argsToBytes(Client.GenericExtraArgsV2({gasLimit: GAS_LIMIT, allowOutOfOrderExecution: true}))
            ),
            "extraArgs encode the requested gas limit"
        );

        bytes32 messageId = routerA.deliverNext();

        // THE ASSERTION THAT MATTERS: destination state changed, and it changed
        // because the destination DAO executed it.
        assertEq(targetB.cancelCount(), 1, "destination action executed");
        assertEq(targetB.lastCaller(), address(b.dao), "executed BY the destination DAO");

        // Nothing was stored as failed.
        bytes32 callId = b.controller.deriveCallId(CHAIN_A, messageId);
        assertFalse(b.controller.getFailedMessage(callId).pending, "no failed message");
    }

    function test_roundTrip_worksInBothDirections() public {
        // A -> B
        _proposeAndForward(keccak256("proposal-a2b"), CHAIN_B, _cancelPayload(targetB));
        routerA.deliverNext();
        assertEq(targetB.cancelCount(), 1, "A->B landed");

        // B -> A, using the mirror-image configuration.
        Action[] memory proposalActions = new Action[](1);
        proposalActions[0] = Action({
            to: address(b.controller),
            value: 0,
            data: abi.encodeCall(
                CrossChainController.forwardMessage, (CHAIN_A, GAS_LIMIT, _cancelPayload(targetA))
                )
        });
        vm.prank(plugin);
        b.dao.execute(keccak256("proposal-b2a"), proposalActions, 0);

        routerB.deliverNext();

        assertEq(targetA.cancelCount(), 1, "B->A landed");
        assertEq(targetA.lastCaller(), address(a.dao), "executed BY the origin DAO");
    }

    function test_roundTrip_deploymentAssertionsPassOnCorrectWiring() public view {
        a.adapter.assertTrustedRemotesMatchControllers(_uint256s(CHAIN_B), _addresses(address(b.controller)));
        b.adapter.assertTrustedRemotesMatchControllers(_uint256s(CHAIN_A), _addresses(address(a.controller)));
        a.adapter.assertChainSelectorsMatchController(_uint256s(CHAIN_B));
        b.adapter.assertChainSelectorsMatchController(_uint256s(CHAIN_A));
    }

    function test_roundTrip_deploymentAssertionCatchesSwappedTrustedRemote() public {
        // The canonical footgun: trust the remote ADAPTER instead of the remote
        // CONTROLLER. Inbound liveness is silently, totally lost.
        _setTrustedRemote(b, CHAIN_A, address(a.adapter));

        vm.expectRevert(
            abi.encodeWithSelector(Errors.TRUSTED_REMOTE_MISMATCH.selector, CHAIN_A, address(a.adapter), address(a.controller))
        );
        b.adapter.assertTrustedRemotesMatchControllers(_uint256s(CHAIN_A), _addresses(address(a.controller)));

        // And the flow really does break, not merely the assertion.
        _proposeAndForward(keccak256("proposal-swapped"), CHAIN_B, _cancelPayload(targetB));
        vm.expectRevert(Errors.REMOTE_NOT_TRUSTED.selector);
        routerA.deliverNext();
        assertEq(targetB.cancelCount(), 0, "nothing executed");
    }

    // -------------------------------------------------------------------------
    // The permissions are load-bearing
    // -------------------------------------------------------------------------

    /// @dev Hop E of the design: the destination controller holds
    ///      `EXECUTE_PERMISSION` on the destination DAO. Revoking it must not
    ///      break bridge delivery (that would strand the message in CCIP); it
    ///      must land in the defensive store instead.
    function test_permissions_destinationControllerWithoutExecutePermission() public {
        b.dao.revoke(address(b.dao), address(b.controller), EXECUTE_PERMISSION_ID);

        _proposeAndForward(keccak256("proposal-noexec"), CHAIN_B, _cancelPayload(targetB));
        bytes32 messageId = routerA.deliverNext();

        assertEq(targetB.cancelCount(), 0, "action must not have executed");

        bytes32 callId = b.controller.deriveCallId(CHAIN_A, messageId);
        CrossChainController.FailedMessage memory failed = b.controller.getFailedMessage(callId);
        assertTrue(failed.pending, "message stored for retry");
        assertEq(failed.originChainId, CHAIN_A, "origin chain recorded");
        assertEq(failed.messageId, messageId, "message id recorded");

        // Restoring the grant is what makes the retry succeed — proving the
        // permission, not something else, was the blocker.
        b.dao.grant(address(b.dao), address(b.controller), EXECUTE_PERMISSION_ID);
        vm.prank(address(b.dao));
        b.controller.retryFailedMessage(callId);

        assertEq(targetB.cancelCount(), 1, "action lands after the grant is restored");
        assertFalse(b.controller.getFailedMessage(callId).pending, "no longer pending");
    }

    /// @dev The reason stored for the caller is the real `Unauthorized` error
    ///      from the destination DAO's `PermissionManager`, not a generic one.
    function test_permissions_destinationFailureReasonIsPermissionManagerUnauthorized() public {
        b.dao.revoke(address(b.dao), address(b.controller), EXECUTE_PERMISSION_ID);

        bytes memory payload = _cancelPayload(targetB);
        _proposeAndForward(keccak256("proposal-reason"), CHAIN_B, payload);

        vm.recordLogs();
        routerA.deliverNext();

        bytes memory expected = abi.encodeWithSelector(
            PermissionManager.Unauthorized.selector, address(b.dao), address(b.controller), EXECUTE_PERMISSION_ID
        );

        bool found;
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == keccak256("MessageExecutionFailed(uint256,bytes32,bytes32,bytes)")) {
                bytes memory reason = abi.decode(logs[i].data, (bytes));
                assertEq(keccak256(reason), keccak256(expected), "stored reason is the DAO's Unauthorized error");
                found = true;
            }
        }
        assertTrue(found, "MessageExecutionFailed emitted");
    }

    /// @dev Hop B: the origin DAO holds `FORWARD_MESSAGE_PERMISSION` on its
    ///      controller. Revoke it and the proposal must fail on-chain.
    function test_permissions_originDaoWithoutForwardPermission() public {
        a.dao.revoke(address(a.controller), address(a.dao), FORWARD_MESSAGE_PERMISSION_ID);

        Action[] memory proposalActions = new Action[](1);
        proposalActions[0] = Action({
            to: address(a.controller),
            value: 0,
            data: abi.encodeCall(
                CrossChainController.forwardMessage, (CHAIN_B, GAS_LIMIT, _cancelPayload(targetB))
                )
        });

        vm.prank(plugin);
        vm.expectRevert(abi.encodeWithSelector(DAO.ActionFailed.selector, 0));
        a.dao.execute(keccak256("proposal-noforward"), proposalActions, 0);

        assertEq(routerA.sentCount(), 0, "nothing was bridged");
    }

    /// @dev And an outsider cannot shortcut the DAO by calling the controller
    ///      directly — the underlying revert is `DaoUnauthorized`, which
    ///      `DAO.execute` above hides behind `ActionFailed`.
    function test_permissions_strangerCannotForwardDirectly() public {
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector,
                address(a.dao),
                address(a.controller),
                stranger,
                FORWARD_MESSAGE_PERMISSION_ID
            )
        );
        a.controller.forwardMessage(CHAIN_B, GAS_LIMIT, _cancelPayload(targetB));
    }

    /// @dev Hop D: only a registered local adapter may hand a payload to the
    ///      destination controller. This is the last line of defence — anything
    ///      that reaches `receiveMessage` gets executed on the DAO.
    function test_permissions_unregisteredAdapterCannotCallReceiveMessage() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Errors.CALLER_NOT_LOCAL_ADAPTER.selector, stranger));
        b.controller.receiveMessage(keccak256("forged"), _cancelPayload(targetB), CHAIN_A);

        // Not even the origin adapter, and not even the DAO itself.
        vm.prank(address(a.adapter));
        vm.expectRevert(abi.encodeWithSelector(Errors.CALLER_NOT_LOCAL_ADAPTER.selector, address(a.adapter)));
        b.controller.receiveMessage(keccak256("forged"), _cancelPayload(targetB), CHAIN_A);

        vm.prank(address(b.dao));
        vm.expectRevert(abi.encodeWithSelector(Errors.CALLER_NOT_LOCAL_ADAPTER.selector, address(b.dao)));
        b.controller.receiveMessage(keccak256("forged"), _cancelPayload(targetB), CHAIN_A);

        assertEq(targetB.cancelCount(), 0, "nothing executed");
    }

    /// @dev Clearing the last lane an adapter serves must de-register it, so a
    ///      rotated-out adapter can no longer deliver payloads.
    function test_permissions_rotatedOutAdapterLosesReceiveRights() public {
        assertTrue(b.controller.isRegisteredLocalAdapter(address(b.adapter)), "registered before");

        CrossChainController.ChainConfig[] memory cleared = new CrossChainController.ChainConfig[](1);
        vm.prank(address(b.dao));
        b.controller.updateConfig(_uint256s(CHAIN_A), cleared);

        assertFalse(b.controller.isRegisteredLocalAdapter(address(b.adapter)), "de-registered after");

        vm.prank(address(b.adapter));
        vm.expectRevert(abi.encodeWithSelector(Errors.CALLER_NOT_LOCAL_ADAPTER.selector, address(b.adapter)));
        b.controller.receiveMessage(keccak256("forged"), _cancelPayload(targetB), CHAIN_A);
    }

    /// @dev Hop C, sender half: an unknown or wrong originator is rejected by
    ///      the destination adapter before the controller is ever reached.
    function test_permissions_unknownTrustedRemoteIsRejected() public {
        vm.expectRevert(Errors.REMOTE_NOT_TRUSTED.selector);
        _forgeDelivery(keccak256("forged"), SELECTOR_A, stranger, _cancelPayload(targetB));

        // The remote ADAPTER is specifically NOT trusted, even though it is a
        // legitimate contract of the same deployment.
        vm.expectRevert(Errors.REMOTE_NOT_TRUSTED.selector);
        _forgeDelivery(keccak256("forged"), SELECTOR_A, address(a.adapter), _cancelPayload(targetB));

        // A zero sender is rejected too, rather than matching an unset lane.
        vm.expectRevert(Errors.REMOTE_NOT_TRUSTED.selector);
        _forgeDelivery(keccak256("forged"), SELECTOR_A, address(0), _cancelPayload(targetB));

        assertEq(targetB.cancelCount(), 0, "nothing executed");
    }

    /// @dev Hop C, chain half: a message arriving on a selector the adapter has
    ///      no mapping for is rejected, so a message cannot be replayed in from
    ///      an unconfigured chain even by the correct sender address.
    function test_permissions_unknownSourceChainSelectorIsRejected() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.UNKNOWN_NATIVE_CHAIN_ID.selector, uint256(SELECTOR_UNKNOWN)));
        _forgeDelivery(keccak256("forged"), SELECTOR_UNKNOWN, address(a.controller), _cancelPayload(targetB));

        assertEq(targetB.cancelCount(), 0, "nothing executed");
    }

    /// @dev A KNOWN selector whose lane has no trusted remote is rejected as
    ///      untrusted: chain B maps selector B to id 8453 but trusts nobody
    ///      there, and `address(0) != sender` keeps it closed.
    function test_permissions_knownSelectorWithoutTrustedRemoteIsRejected() public {
        vm.expectRevert(Errors.REMOTE_NOT_TRUSTED.selector);
        _forgeDelivery(keccak256("forged"), SELECTOR_B, address(a.controller), _cancelPayload(targetB));
    }

    /// @dev Only the CCIP router may call the destination adapter.
    function test_permissions_onlyRouterCanCallCcipReceive() public {
        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: keccak256("forged"),
            sourceChainSelector: SELECTOR_A,
            sender: abi.encode(address(a.controller)),
            data: _cancelPayload(targetB),
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        vm.prank(stranger);
        vm.expectRevert(Errors.CALLER_NOT_CCIP_ROUTER.selector);
        b.adapter.ccipReceive(message);

        // Even the origin router cannot deliver directly on chain B.
        vm.prank(address(routerA));
        vm.expectRevert(Errors.CALLER_NOT_CCIP_ROUTER.selector);
        b.adapter.ccipReceive(message);
    }

    /// @dev `UPDATE_CONFIG_PERMISSION` is effectively root on the DAO. Prove it
    ///      is not reachable from an EOA in this wiring.
    function test_permissions_strangerCannotUpdateConfigOrTrustedRemotes() public {
        CrossChainController.ChainConfig[] memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = CrossChainController.ChainConfig({
            localAdapter: stranger,
            remoteAdapter: stranger,
            bridgeChainId: SELECTOR_B
        });

        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector, address(a.dao), address(a.controller), stranger, UPDATE_CONFIG_PERMISSION_ID
            )
        );
        a.controller.updateConfig(_uint256s(CHAIN_B), configs);

        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector,
                address(b.dao),
                address(b.adapter),
                stranger,
                UPDATE_ADAPTER_CONFIG_PERMISSION_ID
            )
        );
        b.adapter.setTrustedRemotes(_uint256s(CHAIN_A), _addresses(stranger));
    }

    /// @dev An unconfigured destination must revert loudly rather than let a
    ///      proposal "execute" while nothing is bridged.
    function test_permissions_forwardToUnconfiguredChainReverts() public {
        Action[] memory proposalActions = new Action[](1);
        proposalActions[0] = Action({
            to: address(a.controller),
            value: 0,
            data: abi.encodeCall(
                CrossChainController.forwardMessage, (CHAIN_UNKNOWN, GAS_LIMIT, _cancelPayload(targetB))
                )
        });

        vm.prank(plugin);
        vm.expectRevert(abi.encodeWithSelector(DAO.ActionFailed.selector, 0));
        a.dao.execute(keccak256("proposal-unknown-chain"), proposalActions, 0);

        assertEq(routerA.sentCount(), 0, "nothing was bridged");
    }

    // -------------------------------------------------------------------------
    // Failure / retry path, end to end
    // -------------------------------------------------------------------------

    function test_retry_failedDestinationActionIsStoredAndRetriedAfterFix() public {
        targetB.setLocked(true);

        _proposeAndForward(keccak256("proposal-retry"), CHAIN_B, _cancelPayload(targetB));

        // Bridge delivery itself must SUCCEED: a revert here would leave the
        // message stuck in CCIP's manual-execution window instead of in our own
        // retry store.
        bytes32 messageId = routerA.deliverNext();

        bytes32 callId = b.controller.deriveCallId(CHAIN_A, messageId);
        CrossChainController.FailedMessage memory failed = b.controller.getFailedMessage(callId);
        assertTrue(failed.pending, "stored as pending");
        assertEq(keccak256(failed.payload), keccak256(_cancelPayload(targetB)), "payload preserved verbatim");
        assertEq(targetB.cancelCount(), 0, "not executed");

        // Retry while still broken: it must revert and stay pending. The DAO
        // masks the action's own `TargetLocked` behind `ActionFailed(index)`,
        // which is why the defensive store keeps the raw payload rather than
        // relying on the reason.
        vm.prank(address(b.dao));
        vm.expectRevert(abi.encodeWithSelector(DAO.ActionFailed.selector, 0));
        b.controller.retryFailedMessage(callId);
        assertTrue(b.controller.getFailedMessage(callId).pending, "still pending after a failed retry");

        // Fix the cause, retry, and the action lands.
        targetB.setLocked(false);
        vm.prank(address(b.dao));
        b.controller.retryFailedMessage(callId);

        assertEq(targetB.cancelCount(), 1, "action landed on retry");
        assertEq(targetB.lastCaller(), address(b.dao), "still executed BY the DAO");
        assertFalse(b.controller.getFailedMessage(callId).pending, "cleared");
    }

    function test_retry_requiresRetryPermission() public {
        targetB.setLocked(true);
        _proposeAndForward(keccak256("proposal-retry-perm"), CHAIN_B, _cancelPayload(targetB));
        bytes32 messageId = routerA.deliverNext();
        bytes32 callId = b.controller.deriveCallId(CHAIN_A, messageId);

        targetB.setLocked(false);

        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector,
                address(b.dao),
                address(b.controller),
                stranger,
                RETRY_MESSAGE_PERMISSION_ID
            )
        );
        b.controller.retryFailedMessage(callId);

        assertEq(targetB.cancelCount(), 0, "not executed by an unauthorized retry");

        // Revoking the DAO's own grant closes the path too.
        b.dao.revoke(address(b.controller), address(b.dao), RETRY_MESSAGE_PERMISSION_ID);
        vm.prank(address(b.dao));
        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector,
                address(b.dao),
                address(b.controller),
                address(b.dao),
                RETRY_MESSAGE_PERMISSION_ID
            )
        );
        b.controller.retryFailedMessage(callId);
    }

    /// @dev A pending message must not be overwritten by a re-delivery of the
    ///      same message id (CCIP manual execution can re-run a message).
    function test_retry_redeliveryOfAPendingMessageIsRejected() public {
        targetB.setLocked(true);
        _proposeAndForward(keccak256("proposal-redeliver"), CHAIN_B, _cancelPayload(targetB));
        bytes32 messageId = routerA.deliverNext();
        bytes32 callId = b.controller.deriveCallId(CHAIN_A, messageId);

        vm.expectRevert(abi.encodeWithSelector(Errors.MESSAGE_ALREADY_PENDING.selector, callId));
        _forgeDelivery(messageId, SELECTOR_A, address(a.controller), _cancelPayload(targetB));
    }

    // -------------------------------------------------------------------------
    // Fee handling
    // -------------------------------------------------------------------------

    function test_fees_arePaidFromTheControllerBalance() public {
        uint256 before = address(a.controller).balance;

        _proposeAndForward(keccak256("proposal-fee"), CHAIN_B, _cancelPayload(targetB));

        assertEq(address(a.controller).balance, before - FEE, "fee left the controller");
        assertEq(address(routerA).balance, FEE, "router received it");
        assertEq(address(a.adapter).balance, 0, "the adapter never custodies funds");
    }

    function test_fees_insufficientBalanceRevertsWithTheOpsAlertError() public {
        // Drain the controller through the permissioned sweep, as ops would.
        uint256 balance = address(a.controller).balance;
        vm.prank(address(a.dao));
        a.controller.sweep(address(0), address(a.dao), balance);
        assertEq(address(a.controller).balance, 0, "drained");

        vm.prank(address(a.dao));
        vm.expectRevert(abi.encodeWithSelector(Errors.INSUFFICIENT_FEE_BALANCE.selector, address(0), FEE, 0));
        a.controller.forwardMessage(CHAIN_B, GAS_LIMIT, _cancelPayload(targetB));
    }

    function test_fees_quoteMatchesWhatTheSendPathCharges() public {
        (address feeToken, uint256 fee, uint256 available) =
            a.controller.quoteFee(CHAIN_B, GAS_LIMIT, _cancelPayload(targetB));

        assertEq(feeToken, address(0), "native");
        assertEq(fee, FEE, "quoted fee");
        assertEq(available, address(a.controller).balance, "available balance is the controller's");

        uint256 before = address(a.controller).balance;
        _proposeAndForward(keccak256("proposal-quote"), CHAIN_B, _cancelPayload(targetB));
        assertEq(before - address(a.controller).balance, fee, "charged exactly the quote");
    }
}
