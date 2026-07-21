// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {CrossChainController} from "../../../src/common/crosschain/CrossChainController.sol";
import {Errors} from "../../../src/common/crosschain/lib/Errors.sol";
import {Action} from "../../../src/common/executors/IExecutor.sol";
import {DaoUnauthorized} from "../../../src/common/permission/auth/auth.sol";
import {AdapterMock} from "../../mocks/commons/crosschain/AdapterMock.sol";
import {
    MaliciousAdapterMock, PwnTarget
} from "../../mocks/commons/crosschain/MaliciousAdapterMock.sol";
import {CrossChainControllerDAOMock} from "../../mocks/commons/crosschain/CrossChainControllerDAOMock.sol";
import {ERC20Mock} from "../../mocks/commons/token/ERC20Mock.sol";
import {ActionExecute} from "../../mocks/commons/executors/ActionExecute.sol";

/// @notice Regression suite for the "Option 1" `CrossChainController`
///         (`src/common/crosschain/CrossChainController.sol`), which sends by
///         `delegatecall`ing the local adapter instead of `call`ing it. Every
///         send-path parameter that used to live in adapter storage now lives
///         in the controller's `chainToAdapter` mapping and is passed as an
///         argument, so the adapter's send path reads NO storage.
///
/// Sections a)-j) preserve the pre-redesign coverage (inbound auth, adapter
/// rotation, `updateConfig` validation, silent-no-op / fail-loudly guards,
/// forwarding auth + happy path, fees, defensive receive/retry, the
/// `executeActions` self-call guard, `sweep`, `deriveCallId`), adapted to the
/// new `ChainConfig{localAdapter, remoteAdapter, bridgeChainId}` shape and to
/// `AdapterMock` now being immutable-configured (constructor args, no
/// setters, records calls via `SendMessageCalled` instead of storage).
///
/// Sections k)-o) are NEW and are the entire point of this redesign:
///  k) the controller's own storage is byte-identical before/after a send
///     (no collision with whatever the delegatecalled adapter code touches);
///  l) two adapters with different `immutable`s produce provably different
///     results, proving delegatecall resolves the CALLED adapter's bytecode
///     immutables, not the controller's storage;
///  m) an unconfigured/zeroed `bridgeChainId` can never silently address
///     bridge lane `0`;
///  n) an adapter's send path refuses to run outside a delegatecall from its
///     owning controller;
///  o) the accepted residual risk (security-review finding 7): whoever holds
///     `UPDATE_CONFIG_PERMISSION` can fully take over the controller and, by
///     extension, the DAO. This is NOT mitigated in code; it documents why
///     that permission must be DAO-only.
contract CrossChainControllerTest is Test {
    // Solc 0.8.17 (this repo's pinned version) cannot `emit Contract.Event(...)`
    // for an externally-defined event, so every event under test is
    // redeclared here with an IDENTICAL signature purely so `vm.expectEmit`
    // has something to match topics/data against (topic0 only depends on the
    // signature, not on which contract declares it).
    event ConfigUpdated(
        uint256 indexed chainId, address localAdapter, address remoteAdapter, uint64 bridgeChainId
    );
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
    /// @dev Mirrors `AdapterMock.SendMessageCalled`. IMPORTANT: because
    ///      `forwardMessage` reaches this via `delegatecall`, the EVM records
    ///      the log's emitting address as the CONTROLLER, not the adapter
    ///      (exactly like storage, `LOG*` uses the current execution
    ///      context's address, which delegatecall does not change). Every
    ///      `vm.expectEmit` against this event below therefore targets
    ///      `address(controller)`, never the adapter.
    event SendMessageCalled(
        address context, address receiver, uint64 bridgeChainId, uint256 gasLimit, bytes message, uint256 value
    );

    uint256 internal constant CHAIN_ID = 10;
    uint256 internal constant OTHER_CHAIN_ID = 20;
    uint256 internal constant GAS_LIMIT = 200_000;
    uint64 internal constant BRIDGE_CHAIN_ID = 1000;
    uint64 internal constant OTHER_BRIDGE_CHAIN_ID = 2000;

    CrossChainControllerDAOMock internal daoMock;
    CrossChainController internal controller;
    AdapterMock internal adapterA;
    AdapterMock internal adapterB;
    ERC20Mock internal feeToken;
    ActionExecute internal actionTarget;

    address internal remoteAdapterA;
    address internal remoteAdapterB;
    address internal feeSinkA;
    address internal feeSinkB;
    address internal alice; // holds every permission
    address internal bob; // holds none

    bytes32 internal FORWARD_MESSAGE_PERMISSION_ID;
    bytes32 internal UPDATE_CONFIG_PERMISSION_ID;
    bytes32 internal RETRY_MESSAGE_PERMISSION_ID;
    bytes32 internal SWEEP_PERMISSION_ID;

    function setUp() public {
        daoMock = new CrossChainControllerDAOMock();
        controller = new CrossChainController(address(daoMock));

        feeToken = new ERC20Mock("Fee", "FEE");
        actionTarget = new ActionExecute();

        remoteAdapterA = makeAddr("remoteAdapterA");
        remoteAdapterB = makeAddr("remoteAdapterB");
        feeSinkA = makeAddr("feeSinkA");
        feeSinkB = makeAddr("feeSinkB");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        // Default adapters: zero fee, native. Most tests that aren't
        // specifically about fee mechanics use these unmodified so they don't
        // need to fund the controller. `AdapterMock` has no setters -- tests
        // that need different fee/messageId/feeSink/revert behaviour deploy
        // their own dedicated instance instead.
        adapterA = new AdapterMock(address(controller), address(0), 0, bytes32(uint256(1)), feeSinkA, false, false);
        adapterB = new AdapterMock(address(controller), address(0), 0, bytes32(uint256(2)), feeSinkB, false, false);

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

    function _lane(
        address _local,
        address _remote,
        uint64 _bridgeChainId
    ) internal pure returns (CrossChainController.ChainConfig memory) {
        return CrossChainController.ChainConfig({
            localAdapter: _local,
            remoteAdapter: _remote,
            bridgeChainId: _bridgeChainId
        });
    }

    function _configureLane(uint256 _chainId, address _local, address _remote, uint64 _bridgeChainId) internal {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = _chainId;
        CrossChainController.ChainConfig[] memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = _lane(_local, _remote, _bridgeChainId);

        vm.prank(alice);
        controller.updateConfig(chainIds, configs);
    }

    function _emptyActionsPayload() internal pure returns (bytes memory) {
        return abi.encode(new Action[](0));
    }

    /// @dev Storage layout, verified with
    ///      `forge inspect .../CrossChainController.sol:CrossChainController storageLayout`:
    ///      slot 0 = `chainToAdapter`, slot 1 = `_localAdapterLaneCount`,
    ///      slot 2 = `_failedMessages`. `chainToAdapter[_chainId]` occupies
    ///      TWO words: word 0 holds `localAdapter`; word 1 packs
    ///      `remoteAdapter` (low 20 bytes) with `bridgeChainId` (next 8
    ///      bytes). This returns word 0's slot; word 1 is `+ 1`.
    function _chainConfigSlot(uint256 _chainId) internal pure returns (bytes32) {
        return keccak256(abi.encode(_chainId, uint256(0)));
    }

    /// @dev The slot of `_localAdapterLaneCount[_adapter]` (mapping at slot 1).
    function _laneCountSlot(address _adapter) internal pure returns (bytes32) {
        return keccak256(abi.encode(_adapter, uint256(1)));
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
        AdapterMock strangerAdapter =
            new AdapterMock(address(controller), address(0), 0, bytes32(0), feeSinkA, false, false);
        vm.expectRevert(abi.encodeWithSelector(Errors.CALLER_NOT_LOCAL_ADAPTER.selector, address(strangerAdapter)));
        vm.prank(address(strangerAdapter));
        controller.receiveMessage(bytes32(uint256(1)), _emptyActionsPayload(), CHAIN_ID);
    }

    function test_receiveMessage_succeedsForRegisteredLocalAdapter() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);

        bytes32 messageId = bytes32(uint256(42));
        vm.prank(address(adapterA));
        bytes32 callId = controller.receiveMessage(messageId, _emptyActionsPayload(), CHAIN_ID);

        assertEq(callId, controller.deriveCallId(CHAIN_ID, messageId));
    }

    function test_receiveMessage_revertsIfMessageAlreadyPending() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);

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
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);

        vm.prank(address(adapterA));
        controller.receiveMessage(bytes32(uint256(1)), _emptyActionsPayload(), CHAIN_ID);

        // Rotate the lane to adapterB.
        _configureLane(CHAIN_ID, address(adapterB), remoteAdapterB, BRIDGE_CHAIN_ID);

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
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);
        _configureLane(OTHER_CHAIN_ID, address(adapterA), remoteAdapterB, OTHER_BRIDGE_CHAIN_ID);

        assertEq(controller.localAdapterLaneCount(address(adapterA)), 2);
        assertTrue(controller.isRegisteredLocalAdapter(address(adapterA)));

        // Clear the first lane only; adapterA must remain authorized.
        _configureLane(CHAIN_ID, address(0), address(0), 0);

        assertEq(controller.localAdapterLaneCount(address(adapterA)), 1);
        assertTrue(controller.isRegisteredLocalAdapter(address(adapterA)));

        vm.prank(address(adapterA));
        controller.receiveMessage(bytes32(uint256(1)), _emptyActionsPayload(), OTHER_CHAIN_ID);

        // Clear the second (last) lane; adapterA now loses authorization.
        _configureLane(OTHER_CHAIN_ID, address(0), address(0), 0);

        assertEq(controller.localAdapterLaneCount(address(adapterA)), 0);
        assertFalse(controller.isRegisteredLocalAdapter(address(adapterA)));

        vm.expectRevert(abi.encodeWithSelector(Errors.CALLER_NOT_LOCAL_ADAPTER.selector, address(adapterA)));
        vm.prank(address(adapterA));
        controller.receiveMessage(bytes32(uint256(2)), _emptyActionsPayload(), OTHER_CHAIN_ID);
    }

    function test_updateConfig_clearingLaneWithAllZeroConfigResetsMapping() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);
        _configureLane(CHAIN_ID, address(0), address(0), 0);

        (address local, address remote, uint64 bridgeChainId) = controller.chainToAdapter(CHAIN_ID);
        assertEq(local, address(0));
        assertEq(remote, address(0));
        assertEq(bridgeChainId, 0);

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
        CrossChainController.ChainConfig[] memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = _lane(address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);

        vm.expectRevert(Errors.INVALID_LENGTH_MISMATCH.selector);
        vm.prank(alice);
        controller.updateConfig(chainIds, configs);
    }

    function test_updateConfig_revertsOnZeroChainId() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = 0;
        CrossChainController.ChainConfig[] memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = _lane(address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);

        vm.expectRevert(Errors.INVALID_CHAIN_ID.selector);
        vm.prank(alice);
        controller.updateConfig(chainIds, configs);
    }

    function test_updateConfig_revertsOnHalfConfiguredLane_missingRemote() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = CHAIN_ID;
        CrossChainController.ChainConfig[] memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = _lane(address(adapterA), address(0), BRIDGE_CHAIN_ID);

        vm.expectRevert(abi.encodeWithSelector(Errors.INCOMPLETE_ADAPTER_CONFIG.selector, CHAIN_ID));
        vm.prank(alice);
        controller.updateConfig(chainIds, configs);
    }

    function test_updateConfig_revertsOnHalfConfiguredLane_missingLocal() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = CHAIN_ID;
        CrossChainController.ChainConfig[] memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = _lane(address(0), remoteAdapterA, BRIDGE_CHAIN_ID);

        vm.expectRevert(abi.encodeWithSelector(Errors.INCOMPLETE_ADAPTER_CONFIG.selector, CHAIN_ID));
        vm.prank(alice);
        controller.updateConfig(chainIds, configs);
    }

    /// @dev NEW dimension introduced by `ChainConfig` gaining `bridgeChainId`:
    ///      adapters set but the bridge-native id left at `0` is just as much
    ///      a half-configured lane as a missing address would be -- `0` is
    ///      the "unset" marker and would otherwise silently address bridge
    ///      lane `0`. See `m)` below for the complementary "already stored,
    ///      then zeroed by hand" scenario.
    function test_updateConfig_revertsOnHalfConfiguredLane_missingBridgeChainId() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = CHAIN_ID;
        CrossChainController.ChainConfig[] memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = _lane(address(adapterA), remoteAdapterA, 0);

        vm.expectRevert(abi.encodeWithSelector(Errors.INCOMPLETE_ADAPTER_CONFIG.selector, CHAIN_ID));
        vm.prank(alice);
        controller.updateConfig(chainIds, configs);
    }

    function test_updateConfig_revertsIfCallerUnauthorized() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = CHAIN_ID;
        CrossChainController.ChainConfig[] memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = _lane(address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);

        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector, address(daoMock), address(controller), bob, UPDATE_CONFIG_PERMISSION_ID
            )
        );
        vm.prank(bob);
        controller.updateConfig(chainIds, configs);
    }

    function test_updateConfig_emitsConfigUpdatedWithCorrectPayload() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = CHAIN_ID;
        CrossChainController.ChainConfig[] memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = _lane(address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);

        vm.expectEmit(true, false, false, true, address(controller));
        emit ConfigUpdated(CHAIN_ID, address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);

        vm.prank(alice);
        controller.updateConfig(chainIds, configs);
    }

    // -------------------------------------------------------------------------
    // d) forwardMessage must never return successfully having bridged nothing
    // -------------------------------------------------------------------------
    //
    // `forwardMessage` is on the critical path of a governance proposal
    // racing an on-chain deadline: a silent no-op would let the proposal
    // "execute" and look healthy while the message never left the chain.
    // Every way dispatch can fail must revert, not return: (1) unset lane,
    // (2) codeless local adapter, (3) an adapter revert (reason bubbled
    // verbatim), (4) insufficient fee balance (covered under fees, f)), and
    // (5) a "successful" delegatecall that did not return a well-formed
    // `(bytes32, address, uint256)`.

    function test_forwardMessage_revertsIfChainNotConfigured() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.ADAPTER_NOT_CONFIGURED.selector, CHAIN_ID));
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    function test_forwardMessage_revertsIfLocalAdapterHasNoCode() public {
        address codelessAdapter = makeAddr("codelessAdapter");
        address codelessRemote = makeAddr("codelessRemote");
        _configureLane(CHAIN_ID, codelessAdapter, codelessRemote, BRIDGE_CHAIN_ID);

        assertEq(codelessAdapter.code.length, 0);

        vm.expectRevert(abi.encodeWithSelector(Errors.ADAPTER_HAS_NO_CODE.selector, codelessAdapter));
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    function test_forwardMessage_bubblesAdapterRevertReasonVerbatim() public {
        AdapterMock revertingAdapter =
            new AdapterMock(address(controller), address(0), 0, bytes32(0), feeSinkA, true, false);
        _configureLane(CHAIN_ID, address(revertingAdapter), remoteAdapterA, BRIDGE_CHAIN_ID);

        // `AdapterMock` reverts with a plain string reason; `forwardMessage`
        // must bubble that exact reason rather than swallowing it.
        vm.expectRevert("AdapterMock: sendMessage reverted");
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    function test_forwardMessage_revertsWithMessageSendFailed_whenAdapterFailsWithNoReturnData() public {
        RevertNoReasonAdapterStub badAdapter = new RevertNoReasonAdapterStub();
        _configureLane(CHAIN_ID, address(badAdapter), remoteAdapterA, BRIDGE_CHAIN_ID);

        vm.expectRevert(Errors.MESSAGE_SEND_FAILED.selector);
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    /// @dev A "successful" delegatecall that returns fewer than 96 bytes
    ///      cannot possibly be a valid `(bytes32 messageId, address feeToken,
    ///      uint256 fee)` triple. `forwardMessage` must fail loudly here too,
    ///      not `abi.decode` garbage and emit `MessageForwarded` with junk.
    function test_forwardMessage_revertsWithMessageSendFailed_whenAdapterReturnsMalformedData() public {
        ShortReturnAdapterStub badAdapter = new ShortReturnAdapterStub();
        _configureLane(CHAIN_ID, address(badAdapter), remoteAdapterA, BRIDGE_CHAIN_ID);

        vm.expectRevert(Errors.MESSAGE_SEND_FAILED.selector);
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    // -------------------------------------------------------------------------
    // e) forwardMessage auth + happy path
    // -------------------------------------------------------------------------

    function test_forwardMessage_revertsIfCallerUnauthorized() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);

        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector, address(daoMock), address(controller), bob, FORWARD_MESSAGE_PERMISSION_ID
            )
        );
        vm.prank(bob);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    function test_forwardMessage_happyPathEmitsMessageForwardedAndReturnsMessageId() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);
        bytes32 expectedMessageId = bytes32(uint256(1)); // adapterA's immutable messageId, set in setUp

        bytes memory message = abi.encode("hello");

        // Emitted from inside the delegatecalled adapter code -- under
        // delegatecall the log's address is the CONTROLLER (see the event
        // redeclaration comment above), and `bridgeChainId`/`receiver` here
        // are exactly what the controller supplied as arguments, proving
        // they reached the adapter correctly.
        vm.expectEmit(true, true, true, true, address(controller));
        emit SendMessageCalled(address(controller), remoteAdapterA, BRIDGE_CHAIN_ID, GAS_LIMIT, message, 0);

        vm.expectEmit(true, true, true, true, address(controller));
        emit MessageForwarded(CHAIN_ID, expectedMessageId, address(adapterA), remoteAdapterA, GAS_LIMIT, address(0), 0);

        vm.prank(alice);
        bytes32 messageId = controller.forwardMessage(CHAIN_ID, GAS_LIMIT, message);

        assertEq(messageId, expectedMessageId);
    }

    // -------------------------------------------------------------------------
    // f) Fees -- and proof the fee flow is DIRECT (no hand-over to the adapter)
    // -------------------------------------------------------------------------
    //
    // Under `delegatecall` there is no separate "adapter balance": the
    // adapter's code runs as the controller, so the fee is paid straight out
    // of the CONTROLLER's balance into whatever the adapter code sends it to
    // (here, `AdapterMock`'s immutable `feeSink`, standing in for a bridge
    // router pulling payment). The tests below assert the controller's
    // balance decreases by exactly the fee and that the adapter CONTRACT's
    // own balance never moves at all -- there is nothing to hand over and
    // nothing that could be stranded on the adapter.

    function test_forwardMessage_nativeFee_revertsIfControllerBalanceInsufficient() public {
        AdapterMock nativeFeeAdapter =
            new AdapterMock(address(controller), address(0), 1 ether, bytes32(uint256(3)), feeSinkA, false, false);
        _configureLane(CHAIN_ID, address(nativeFeeAdapter), remoteAdapterA, BRIDGE_CHAIN_ID);
        // Controller holds 0 native.

        vm.expectRevert(abi.encodeWithSelector(Errors.INSUFFICIENT_FEE_BALANCE.selector, address(0), 1 ether, 0));
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    function test_forwardMessage_nativeFee_feeMovesDirectlyFromControllerToSink_adapterBalanceUntouched() public {
        uint256 requiredFee = 1 ether;
        AdapterMock nativeFeeAdapter = new AdapterMock(
            address(controller), address(0), requiredFee, bytes32(uint256(3)), feeSinkA, false, false
        );
        _configureLane(CHAIN_ID, address(nativeFeeAdapter), remoteAdapterA, BRIDGE_CHAIN_ID);
        vm.deal(address(controller), requiredFee + 3 ether); // extra buffer left untouched

        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());

        assertEq(feeSinkA.balance, requiredFee);
        assertEq(address(controller).balance, 3 ether);
        // No hand-over: the adapter CONTRACT itself never held or moved a
        // wei -- it was never `call`ed with value, only `delegatecall`ed.
        assertEq(address(nativeFeeAdapter).balance, 0);
    }

    function test_forwardMessage_erc20Fee_revertsIfControllerBalanceInsufficient() public {
        AdapterMock erc20FeeAdapter = new AdapterMock(
            address(controller), address(feeToken), 100 ether, bytes32(uint256(4)), feeSinkB, false, false
        );
        _configureLane(CHAIN_ID, address(erc20FeeAdapter), remoteAdapterA, BRIDGE_CHAIN_ID);
        // Controller holds 0 of feeToken.

        vm.expectRevert(
            abi.encodeWithSelector(Errors.INSUFFICIENT_FEE_BALANCE.selector, address(feeToken), 100 ether, 0)
        );
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    function test_forwardMessage_erc20Fee_feeMovesDirectlyFromControllerToSink_adapterBalanceUntouched() public {
        uint256 requiredFee = 100 ether;
        AdapterMock erc20FeeAdapter = new AdapterMock(
            address(controller), address(feeToken), requiredFee, bytes32(uint256(4)), feeSinkB, false, false
        );
        _configureLane(CHAIN_ID, address(erc20FeeAdapter), remoteAdapterA, BRIDGE_CHAIN_ID);
        feeToken.setBalance(address(controller), requiredFee + 1 ether); // extra buffer left untouched

        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());

        assertEq(feeToken.balanceOf(feeSinkB), requiredFee);
        assertEq(feeToken.balanceOf(address(controller)), 1 ether);
        // No hand-over: the ERC20 never touches the adapter CONTRACT's own
        // address -- `IERC20.transfer` is called as/from the controller.
        assertEq(feeToken.balanceOf(address(erc20FeeAdapter)), 0);
    }

    // -------------------------------------------------------------------------
    // g) Defensive receive / retry
    // -------------------------------------------------------------------------

    function test_receiveMessage_capturesRevertingPayloadInsteadOfReverting() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);

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
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);

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
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);
        bytes32 callId = _causeFailure(bytes32(uint256(60)));

        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector, address(daoMock), address(controller), bob, RETRY_MESSAGE_PERMISSION_ID
            )
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
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);

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

    // -------------------------------------------------------------------------
    // k) NEW -- no storage collision between the controller and the
    //    delegatecalled adapter
    // -------------------------------------------------------------------------
    //
    // This is the whole point of moving every send-time parameter into the
    // controller and making the adapter's send path storage-free: a
    // `delegatecall` to code that touched storage would corrupt whatever the
    // controller has at the slots that code happens to write. We snapshot
    // every storage word the controller actually uses (per
    // `forge inspect ... storageLayout`) around a real, successful send and
    // assert byte-for-byte equality, plus the equivalent public getters.

    function test_forwardMessage_doesNotCollideWithControllerStorage() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);

        // Bundled into arrays / a single hash on purpose: enough distinct
        // named locals here (six raw slots, the three `ChainConfig` fields
        // twice over, plus lane-count/registration) trips solc 0.8.17's
        // "stack too deep" with the optimizer configuration this repo pins.
        bytes32[] memory slots = _controllerSnapshotSlots(CHAIN_ID, address(adapterA));
        bytes32[] memory valuesBefore = _loadAll(slots);
        bytes32 gettersHashBefore = _gettersHash(CHAIN_ID, address(adapterA));

        vm.prank(alice);
        bytes32 messageId = controller.forwardMessage(CHAIN_ID, GAS_LIMIT, abi.encode("no collision"));
        // Sanity: the send actually happened, this isn't vacuously true.
        assertEq(messageId, bytes32(uint256(1)));

        bytes32[] memory valuesAfter = _loadAll(slots);
        for (uint256 i = 0; i < slots.length; i++) {
            assertEq(valuesAfter[i], valuesBefore[i]);
        }
        assertEq(_gettersHash(CHAIN_ID, address(adapterA)), gettersHashBefore);
    }

    /// @dev Slot 0/1/2 themselves hold nothing for a mapping (reading them is
    ///      a cheap extra guarantee nothing landed there), plus the two
    ///      concrete words `chainToAdapter[_chainId]` occupies and the one
    ///      word `_localAdapterLaneCount[_adapter]` occupies.
    function _controllerSnapshotSlots(
        uint256 _chainId,
        address _adapter
    ) internal pure returns (bytes32[] memory slots) {
        slots = new bytes32[](6);
        slots[0] = bytes32(uint256(0));
        slots[1] = bytes32(uint256(1));
        slots[2] = bytes32(uint256(2));
        bytes32 configWord0 = _chainConfigSlot(_chainId);
        slots[3] = configWord0;
        slots[4] = bytes32(uint256(configWord0) + 1);
        slots[5] = _laneCountSlot(_adapter);
    }

    function _loadAll(bytes32[] memory _slots) internal view returns (bytes32[] memory values) {
        values = new bytes32[](_slots.length);
        for (uint256 i = 0; i < _slots.length; i++) {
            values[i] = vm.load(address(controller), _slots[i]);
        }
    }

    /// @dev Collapses every public getter relevant to a lane/adapter into one
    ///      hash, so before/after comparisons need one local instead of five.
    function _gettersHash(uint256 _chainId, address _adapter) internal view returns (bytes32) {
        (address local, address remote, uint64 bridgeChainId) = controller.chainToAdapter(_chainId);
        return keccak256(
            abi.encode(
                local,
                remote,
                bridgeChainId,
                controller.localAdapterLaneCount(_adapter),
                controller.isRegisteredLocalAdapter(_adapter)
            )
        );
    }

    // -------------------------------------------------------------------------
    // l) NEW -- immutables resolve to the CALLED adapter's bytecode under
    //    delegatecall, not the controller's storage
    // -------------------------------------------------------------------------

    function test_forwardMessage_immutablesResolveToConfiguredAdapter_notTheOtherOne_notZero() public {
        address sinkX = makeAddr("sinkX");
        address sinkY = makeAddr("sinkY");
        bytes32 messageIdX = bytes32(uint256(111));
        bytes32 messageIdY = bytes32(uint256(222));

        // adapterX: native fee. adapterY: ERC20 fee, different amount,
        // different messageId, different sink. Only adapterX is ever wired
        // into a lane.
        AdapterMock adapterX = new AdapterMock(address(controller), address(0), 1 ether, messageIdX, sinkX, false, false);
        AdapterMock adapterY =
            new AdapterMock(address(controller), address(feeToken), 2 ether, messageIdY, sinkY, false, false);

        _configureLane(CHAIN_ID, address(adapterX), remoteAdapterA, BRIDGE_CHAIN_ID);

        // Fund the controller for BOTH adapters' fees, so a bug that read
        // adapterY's immutables (or the controller's own storage, which has
        // none of this at all) would still be able to "succeed" -- the only
        // thing that can make this assert the right values is genuinely
        // resolving adapterX's bytecode-embedded immutables.
        vm.deal(address(controller), 1 ether);
        feeToken.setBalance(address(controller), 2 ether);

        vm.prank(alice);
        bytes32 messageId = controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());

        assertEq(messageId, messageIdX);
        assertTrue(messageId != messageIdY);
        assertTrue(messageId != bytes32(0));

        // adapterX's fee was moved to adapterX's sink...
        assertEq(sinkX.balance, 1 ether);
        assertEq(address(controller).balance, 0);
        // ...and adapterY's configuration was never touched at all: it was
        // deployed and left wired into nothing, yet still had to exist for
        // this to be a meaningful "not the other one" comparison.
        assertTrue(address(adapterY).code.length > 0);
        assertEq(sinkY.balance, 0);
        assertEq(feeToken.balanceOf(sinkY), 0);
        assertEq(feeToken.balanceOf(address(controller)), 2 ether);
    }

    // -------------------------------------------------------------------------
    // m) NEW -- an unconfigured/zeroed bridgeChainId can never silently send
    //    to bridge lane 0
    // -------------------------------------------------------------------------
    //
    // `test_updateConfig_revertsOnHalfConfiguredLane_missingBridgeChainId`
    // above already proves `updateConfig` rejects `bridgeChainId == 0` with
    // adapters set. This section proves the second half: even if a lane's
    // packed word were force-corrupted to zero the `bridgeChainId` bits
    // directly in storage (bypassing `updateConfig` entirely), the send path
    // still refuses to dispatch rather than silently addressing selector `0`.

    function test_forwardMessage_revertsIfBridgeChainIdZeroedDirectlyInStorage() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA, BRIDGE_CHAIN_ID);

        bytes32 configWord1Slot = bytes32(uint256(_chainConfigSlot(CHAIN_ID)) + 1);
        bytes32 packed = vm.load(address(controller), configWord1Slot);

        // Word 1 is `remoteAdapter` (low 160 bits) | `bridgeChainId` (next 64
        // bits) | padding. Keep the low 160 bits (remoteAdapter), zero
        // everything above (bridgeChainId + padding).
        bytes32 zeroedBridgeChainId = bytes32(uint256(packed) & ((uint256(1) << 160) - 1));
        vm.store(address(controller), configWord1Slot, zeroedBridgeChainId);

        (address local, address remote, uint64 bridgeChainId) = controller.chainToAdapter(CHAIN_ID);
        assertEq(local, address(adapterA)); // untouched
        assertEq(remote, remoteAdapterA); // untouched
        assertEq(bridgeChainId, 0); // corrupted to the "unset" marker

        vm.expectRevert(abi.encodeWithSelector(Errors.ADAPTER_NOT_CONFIGURED.selector, CHAIN_ID));
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    // -------------------------------------------------------------------------
    // n) NEW -- an adapter's send path refuses to run outside a delegatecall
    //    from its owning controller
    // -------------------------------------------------------------------------

    function test_adapterSendMessage_revertsIfCalledDirectlyNotViaControllerDelegatecall() public {
        // Calling `adapterA.sendMessage(...)` directly (a normal `call`, not
        // a `delegatecall` from `controller`) means `address(this)` inside
        // the adapter's code is the ADAPTER itself, which the guard rejects:
        // using the adapter's own (empty) balance and having the bridge see
        // the adapter -- not the controller -- as sender would be wrong.
        vm.expectRevert(abi.encodeWithSelector(Errors.SEND_PATH_NOT_DELEGATECALLED.selector, address(adapterA)));
        adapterA.sendMessage(remoteAdapterA, BRIDGE_CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    // -------------------------------------------------------------------------
    // o) NEW -- residual risk (documentation, not mitigation)
    // -------------------------------------------------------------------------

    /// @notice DOCUMENTS security-review finding 7. This is EXPECTED,
    ///         ACCEPTED behaviour of the `delegatecall` send design -- it is
    ///         NOT a bug for the contract to fix, and this test is not
    ///         supposed to ever start failing as a "regression". It exists so
    ///         that:
    ///          1. the blast radius of `UPDATE_CONFIG_PERMISSION` is provable
    ///             rather than asserted in a comment, and
    ///          2. nobody "fixes" this test by loosening it if a future
    ///             change accidentally narrows the actual risk -- if this
    ///             test starts failing because the takeover no longer works,
    ///             that is a MEANINGFUL change to re-review, not noise.
    ///
    ///         See the NatSpec on `CrossChainController.UPDATE_CONFIG_PERMISSION_ID`:
    ///         this permission is effectively root on the DAO precisely
    ///         because `forwardMessage` executes the configured local
    ///         adapter's code in the controller's own context. Whoever can
    ///         set `localAdapter` can (a) overwrite ANY controller storage
    ///         slot and (b) make the DAO execute ANY action, since the
    ///         controller holds `EXECUTE_PERMISSION` on it. The only real
    ///         mitigation is operational: grant `UPDATE_CONFIG_PERMISSION` to
    ///         the DAO itself ONLY, reachable exclusively through a passed
    ///         proposal.
    function test_residualRisk_maliciousAdapterCanCorruptControllerAndExecuteOnDAO() public {
        PwnTarget target = new PwnTarget();
        bytes32 arbitrarySlot = keccak256("some arbitrary controller storage slot");
        bytes32 arbitraryValue = bytes32(uint256(0xDEADBEEF));

        MaliciousAdapterMock evilAdapter = new MaliciousAdapterMock(
            address(controller), address(daoMock), address(target), arbitrarySlot, arbitraryValue
        );

        // `CrossChainControllerDAOMock.execute` in this suite performs the
        // action unconditionally (it doesn't gate on `EXECUTE_PERMISSION`,
        // unlike a real Aragon `PermissionManager`); the grant below is kept
        // for documentation parity with production, where the controller
        // holding `EXECUTE_PERMISSION` on its DAO is exactly what makes this
        // finding devastating rather than merely embarrassing.
        daoMock.setHasPermission(address(daoMock), address(controller), keccak256("EXECUTE_PERMISSION"), true);

        // Anyone holding UPDATE_CONFIG_PERMISSION -- alice, per setUp --
        // points a lane at the malicious "adapter". In production this
        // permission must be DAO-only; the contract cannot and does not
        // enforce that itself.
        _configureLane(CHAIN_ID, address(evilAdapter), remoteAdapterA, BRIDGE_CHAIN_ID);

        assertEq(vm.load(address(controller), arbitrarySlot), bytes32(0));
        assertFalse(target.pwned());

        // The next ordinary-looking forwardMessage call -- by anyone holding
        // only FORWARD_MESSAGE_PERMISSION, for what looks like a routine send
        // -- actually runs the malicious adapter's code IN THE CONTROLLER'S
        // OWN CONTEXT.
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());

        // (a) Arbitrary controller storage was overwritten.
        assertEq(vm.load(address(controller), arbitrarySlot), arbitraryValue);
        // (b) The DAO executed an arbitrary action chosen by the "adapter".
        assertTrue(target.pwned());
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

/// @dev A non-conforming "adapter" whose `sendMessage` succeeds but returns
///      too little data to be a valid `(bytes32, address, uint256)` triple.
///      Matches `IBaseAdapter.sendMessage`'s selector (name + parameter
///      types only determine the selector, not the return type), so the
///      controller's `delegatecall` dispatches into it exactly as it would a
///      real adapter.
contract ShortReturnAdapterStub {
    function sendMessage(
        address, /* receiver */
        uint64, /* bridgeChainId */
        uint256, /* gasLimit */
        bytes calldata /* message */
    ) external payable returns (bool) {
        return true;
    }
}

/// @dev A non-conforming "adapter" whose `sendMessage` reverts with NO
///      returndata at all, exercising `forwardMessage`'s
///      `returndata.length == 0` branch of `Errors.MESSAGE_SEND_FAILED()`
///      (as opposed to the "reason bubbled verbatim" branch).
contract RevertNoReasonAdapterStub {
    function sendMessage(
        address, /* receiver */
        uint64, /* bridgeChainId */
        uint256, /* gasLimit */
        bytes calldata /* message */
    ) external payable returns (bytes32, address, uint256) {
        revert();
    }
}
