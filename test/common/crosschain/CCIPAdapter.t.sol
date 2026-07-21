// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {
    IAny2EVMMessageReceiver
} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

import {CCIPAdapter} from "../../../src/common/crosschain/adapters/CCIP/CCIPAdapter.sol";
import {IBaseAdapter} from "../../../src/common/crosschain/adapters/IBaseAdapter.sol";
import {CrossChainController} from "../../../src/common/crosschain/CrossChainController.sol";
import {Errors} from "../../../src/common/crosschain/lib/Errors.sol";
import {DaoUnauthorized} from "../../../src/common/permission/auth/auth.sol";
import {Action} from "../../../src/common/executors/IExecutor.sol";
import {IDAO} from "../../../src/common/dao/IDAO.sol";

import {DAOMock} from "../../mocks/commons/dao/DAOMock.sol";
import {ERC20Mock} from "../../mocks/commons/token/ERC20Mock.sol";
import {CCIPRouterMock} from "../../mocks/commons/crosschain/CCIPRouterMock.sol";
import {DelegateCallerMock} from "../../mocks/commons/crosschain/DelegateCallerMock.sol";

/// @notice Regression suite for `CCIPAdapter` (`src/common/crosschain/adapters/CCIP/CCIPAdapter.sol`)
///         written against "Option 1": SEND is now a `delegatecall` from
///         `CrossChainController.forwardMessage` into the local adapter, while
///         RECEIVE stays a normal call from the CCIP Router into the adapter.
///
/// TWO DIFFERENT KINDS OF "REMOTE" ADDRESS APPEAR THROUGHOUT THIS FILE. Naming
/// is deliberately verbose to keep them apart:
///   - `remoteController` -- the remote chain's `CrossChainController`. Because
///     the local send is a `delegatecall`, the account CCIP sees calling
///     `ccipSend` on the source chain is the source CONTROLLER, so THIS is what
///     `_trustedRemotes[chainId]` must hold on the receiving adapter.
///   - `remoteAdapter` -- the remote chain's `CCIPAdapter`, i.e. the bridge-level
///     RECEIVER. This is what `CrossChainController.chainToAdapter[chainId].remoteAdapter`
///     stores locally, as the destination `ccipSend` targets.
///   Confusing the two -- trusting the remote ADAPTER instead of the remote
///   CONTROLLER -- is a silent, total loss of inbound liveness, and is
///   explicitly exercised below (`assertTrustedRemotesMatchControllers`,
///   `TRUSTED_REMOTE_IS_REMOTE_ADAPTER`, and the plain `ccipReceive` misconfig
///   test).
///
/// Setup mirrors production wiring: a `DAOMock` owns a real
/// `CrossChainController`, and every `CCIPAdapter` adopts that controller's DAO
/// in its constructor (`BaseAdapter` -> `DaoAuthorizable`).
///
/// Coverage:
///  a) `_forwardMessage` is not externally callable.
///  b) `ccipReceive` caller / trusted-remote checks and the success path.
///  c) chain-id <-> CCIP-selector mapping, incl. re-pointing and clearing.
///  d) `sendMessage` can ONLY be reached via `delegatecall` from the
///     controller -- never directly, not even by the controller itself via a
///     plain `call`.
///  e) fee handling: the CONTROLLER pays and never hands custody to the
///     adapter, for both native and ERC20 fees.
///  f) config setters (receive-side only) are permissioned and emit events.
///  g) `assertTrustedRemotesMatchControllers` / `assertChainSelectorsMatchController`
///     deployment-time consistency helpers.
///  h) ERC-165 `supportsInterface`.
///  i) an end-to-end send through `CrossChainController.forwardMessage`.
///  j) constructor validation.
///  k) NEW, and the actual point of this redesign: immutables surviving
///     `delegatecall`, no storage collision with the controller, the fee
///     payer being the controller and not the adapter, and the operational
///     consequences of the send/receive config living in two places
///     (desync, and the fee-token-is-immutable trade-off).
contract CCIPAdapterTest is Test {
    // -------------------------------------------------------------------------
    // Real CCIP chain selectors / standard chain ids used throughout.
    // -------------------------------------------------------------------------
    uint64 internal constant SEL_ETH_MAINNET = 5009297550715157269;
    uint64 internal constant SEL_BASE = 15971525489660198786;
    uint64 internal constant SEL_ARBITRUM_ONE = 4949039107694359620;
    uint64 internal constant SEL_SEPOLIA = 16015286601757825753;
    uint64 internal constant SEL_BASE_SEPOLIA = 10344971235874465080;

    uint256 internal constant CHAIN_ETH_MAINNET = 1;
    uint256 internal constant CHAIN_BASE = 8453;
    uint256 internal constant CHAIN_ARBITRUM_ONE = 42161;
    uint256 internal constant CHAIN_SEPOLIA = 11155111;

    // -------------------------------------------------------------------------
    // Events re-declared locally so `vm.expectEmit` can match by signature
    // (solc 0.8.17 cannot `emit Contract.Event(...)` for externally-defined
    // events). `FeeTokenSet` is GONE: there is no setter any more.
    // -------------------------------------------------------------------------
    event ChainSelectorSet(uint256 indexed chainId, uint64 chainSelector);
    event TrustedRemoteSet(uint256 indexed chainId, address trustedRemote);
    event MessageReceived(uint256 indexed originChainId, bytes32 indexed messageId, bytes32 indexed callId);

    DAOMock internal daoMock;
    CrossChainController internal controller;
    CCIPRouterMock internal router;
    ERC20Mock internal feeTokenErc20;

    /// @dev Default adapter from `setUp`: native (`address(0)`) fee token.
    CCIPAdapter internal adapter;
    /// @dev A second adapter sharing `router`, but with `FEE_TOKEN = feeTokenErc20`.
    ///      `FEE_TOKEN` is immutable, so an ERC20-fee lane needs its own adapter
    ///      instance -- there is no setter to flip `adapter` itself over.
    CCIPAdapter internal erc20Adapter;

    /// @dev Drives the two guard-isolation tests that the real controller
    ///      cannot reach (see `DelegateCallerMock`'s own docs).
    DelegateCallerMock internal delegateCallerMock;
    /// @dev An adapter whose `CROSS_CHAIN_CONTROLLER` is `delegateCallerMock`,
    ///      used only by those isolation tests.
    CCIPAdapter internal isolationAdapter;

    address internal alice;
    /// @dev The remote chain's CONTROLLER -- the address CCIP reports as the
    ///      message sender on receive, because the source-chain send is a
    ///      `delegatecall`. This is what `_trustedRemotes[chainId]` holds.
    address internal remoteController;
    /// @dev The remote chain's ADAPTER -- the bridge-level receiver, i.e. what
    ///      `CrossChainController.chainToAdapter[chainId].remoteAdapter` holds.
    ///      NEVER a valid value for `_trustedRemotes`.
    address internal remoteAdapter;

    function setUp() public {
        alice = makeAddr("alice");
        remoteController = makeAddr("remoteController");
        remoteAdapter = makeAddr("remoteAdapter");

        daoMock = new DAOMock();
        controller = new CrossChainController(address(daoMock));
        router = new CCIPRouterMock();
        feeTokenErc20 = new ERC20Mock("Fee Token", "FEE");

        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = CHAIN_ETH_MAINNET;
        address[] memory trustedRemoteControllers = new address[](1);
        trustedRemoteControllers[0] = remoteController;

        uint256[] memory selChainIds = new uint256[](3);
        selChainIds[0] = CHAIN_ETH_MAINNET;
        selChainIds[1] = CHAIN_BASE;
        selChainIds[2] = CHAIN_ARBITRUM_ONE;
        uint64[] memory selectors = new uint64[](3);
        selectors[0] = SEL_ETH_MAINNET;
        selectors[1] = SEL_BASE;
        selectors[2] = SEL_ARBITRUM_ONE;

        adapter = new CCIPAdapter(
            address(controller),
            address(router),
            address(0), // native fee token
            chainIds,
            trustedRemoteControllers,
            selChainIds,
            selectors
        );

        erc20Adapter = new CCIPAdapter(
            address(controller),
            address(router),
            address(feeTokenErc20),
            new uint256[](0),
            new address[](0),
            new uint256[](0),
            new uint64[](0)
        );

        delegateCallerMock = new DelegateCallerMock(IDAO(address(daoMock)));
        isolationAdapter = new CCIPAdapter(
            address(delegateCallerMock),
            address(router),
            address(feeTokenErc20),
            new uint256[](0),
            new address[](0),
            new uint256[](0),
            new uint64[](0)
        );
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /// @dev `DAOMock.hasPermission` is a single flag that authorizes EVERY
    ///      permission once toggled; only flip it inside tests that need it.
    function _grantAllPermissions() internal {
        daoMock.setHasPermissionReturnValueMock(true);
    }

    /// @dev Registers `localAdapter`/`remoteAdapterAddr` as the controller's
    ///      lane for `chainId`, with `bridgeChainId` as the CCIP selector to
    ///      send to. Grants `UPDATE_CONFIG_PERMISSION` in the process.
    function _registerLane(
        uint256 chainId,
        address localAdapter,
        address remoteAdapterAddr,
        uint64 bridgeChainId
    ) internal {
        _grantAllPermissions();
        uint256[] memory ids = new uint256[](1);
        ids[0] = chainId;
        CrossChainController.ChainConfig[] memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = CrossChainController.ChainConfig({
            localAdapter: localAdapter,
            remoteAdapter: remoteAdapterAddr,
            bridgeChainId: bridgeChainId
        });
        controller.updateConfig(ids, configs);
    }

    /// @dev Clears a previously-registered lane (all-zero config).
    function _clearLane(uint256 chainId) internal {
        _grantAllPermissions();
        uint256[] memory ids = new uint256[](1);
        ids[0] = chainId;
        CrossChainController.ChainConfig[] memory configs = new CrossChainController.ChainConfig[](1);
        controller.updateConfig(ids, configs);
    }

    function _buildInbound(
        uint64 selector,
        address sender,
        bytes memory data
    ) internal pure returns (Client.Any2EVMMessage memory) {
        return
            Client.Any2EVMMessage({
                messageId: keccak256("default-inbound-message"),
                sourceChainSelector: selector,
                sender: abi.encode(sender),
                data: data,
                destTokenAmounts: new Client.EVMTokenAmount[](0)
            });
    }

    function _emptyActionsPayload() internal pure returns (bytes memory) {
        return abi.encode(new Action[](0));
    }

    // =========================================================================
    // a) `_forwardMessage` must not be externally callable.
    // =========================================================================

    /// @dev `_forwardMessage` is `internal` on `BaseAdapter`, reachable only
    ///      after `ccipReceive`'s `onlyRouter` and trusted-remote checks. A raw
    ///      call with the old signature must simply fail: the adapter has no
    ///      fallback, so there is no selector for it to hit.
    function test_forwardMessage_isNotExternallyCallable() public {
        (bool success, bytes memory returndata) = address(adapter).call(
            abi.encodeWithSignature("_forwardMessage(bytes32,bytes,uint256)", bytes32(0), bytes(""), CHAIN_ETH_MAINNET)
        );

        assertFalse(success, "_forwardMessage must not be externally callable");
        assertEq(returndata.length, 0, "no fallback exists to handle the unmatched selector");
    }

    // =========================================================================
    // b) `ccipReceive`
    // =========================================================================

    function test_ccipReceive_revertsIfCallerNotRouter() public {
        Client.Any2EVMMessage memory message = _buildInbound(SEL_ETH_MAINNET, remoteController, "");

        vm.expectRevert(Errors.CALLER_NOT_CCIP_ROUTER.selector);
        vm.prank(alice);
        adapter.ccipReceive(message);
    }

    function test_ccipReceive_revertsIfDecodedSenderIsZero() public {
        Client.Any2EVMMessage memory message = _buildInbound(SEL_ETH_MAINNET, address(0), "");

        vm.expectRevert(Errors.REMOTE_NOT_TRUSTED.selector);
        vm.prank(address(router));
        adapter.ccipReceive(message);
    }

    function test_ccipReceive_revertsIfSenderIsAnArbitraryUntrustedAddress() public {
        address untrusted = makeAddr("untrusted");
        Client.Any2EVMMessage memory message = _buildInbound(SEL_ETH_MAINNET, untrusted, "");

        vm.expectRevert(Errors.REMOTE_NOT_TRUSTED.selector);
        vm.prank(address(router));
        adapter.ccipReceive(message);
    }

    /// @dev THE canonical misconfiguration this redesign invites: pointing
    ///      `ccipReceive` at the remote ADAPTER instead of the remote
    ///      CONTROLLER. `remoteAdapter` is a real, meaningful address in this
    ///      suite's config (it's what `chainToAdapter[].remoteAdapter` holds),
    ///      but it must NEVER be a valid `_trustedRemotes` entry.
    function test_ccipReceive_revertsIfSenderIsRemoteAdapterInsteadOfRemoteController() public {
        Client.Any2EVMMessage memory message = _buildInbound(SEL_ETH_MAINNET, remoteAdapter, "");

        vm.expectRevert(Errors.REMOTE_NOT_TRUSTED.selector);
        vm.prank(address(router));
        adapter.ccipReceive(message);
    }

    /// @dev The success path: sender IS the remote CONTROLLER.
    function test_ccipReceive_succeedsWhenSenderIsRemoteControllerAndForwardsToController() public {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter, SEL_ETH_MAINNET);

        bytes memory payload = _emptyActionsPayload();
        bytes32 messageId = keccak256("msg-1");

        Client.Any2EVMMessage memory message = _buildInbound(SEL_ETH_MAINNET, remoteController, payload);
        message.messageId = messageId;

        bytes32 expectedCallId = controller.deriveCallId(CHAIN_ETH_MAINNET, messageId);

        vm.expectEmit(true, true, true, true, address(controller));
        emit MessageReceived(CHAIN_ETH_MAINNET, messageId, expectedCallId);

        vm.prank(address(router));
        adapter.ccipReceive(message);
    }

    // =========================================================================
    // c) chain-id <-> selector mapping
    // =========================================================================

    function test_toNativeChainId_returnsConfiguredSelector() public view {
        assertEq(adapter.toNativeChainId(CHAIN_ETH_MAINNET), uint256(SEL_ETH_MAINNET));
    }

    function test_toNativeChainId_revertsForUnmappedChain() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.UNKNOWN_CHAIN_ID.selector, uint256(999)));
        adapter.toNativeChainId(999);
    }

    function test_fromNativeChainId_isExactInverseOfToNativeChainId() public view {
        assertEq(adapter.fromNativeChainId(uint256(SEL_ETH_MAINNET)), CHAIN_ETH_MAINNET);
        assertEq(adapter.fromNativeChainId(uint256(SEL_BASE)), CHAIN_BASE);
        assertEq(adapter.fromNativeChainId(uint256(SEL_ARBITRUM_ONE)), CHAIN_ARBITRUM_ONE);
    }

    function test_fromNativeChainId_revertsForUnmappedSelector() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.UNKNOWN_NATIVE_CHAIN_ID.selector, uint256(SEL_SEPOLIA)));
        adapter.fromNativeChainId(uint256(SEL_SEPOLIA));
    }

    function test_chainIdMapping_roundTripsOverSeveralConfiguredChains() public view {
        uint256[3] memory chains = [CHAIN_ETH_MAINNET, CHAIN_BASE, CHAIN_ARBITRUM_ONE];
        for (uint256 i = 0; i < chains.length; i++) {
            assertEq(adapter.fromNativeChainId(adapter.toNativeChainId(chains[i])), chains[i]);
        }
    }

    /// @dev A message arriving from a selector never mapped to a standard
    ///      chain id must revert, not be silently treated as chain `0`.
    function test_ccipReceive_revertsForUnmappedSourceSelector() public {
        Client.Any2EVMMessage memory message = _buildInbound(SEL_SEPOLIA, remoteController, "");

        vm.expectRevert(abi.encodeWithSelector(Errors.UNKNOWN_NATIVE_CHAIN_ID.selector, uint256(SEL_SEPOLIA)));
        vm.prank(address(router));
        adapter.ccipReceive(message);
    }

    function test_setChainSelectors_repointingChainClearsOldReverseMapping() public {
        _grantAllPermissions();

        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_ETH_MAINNET;
        uint64[] memory sels = new uint64[](1);
        sels[0] = SEL_BASE_SEPOLIA;
        adapter.setChainSelectors(ids, sels);

        assertEq(adapter.toNativeChainId(CHAIN_ETH_MAINNET), uint256(SEL_BASE_SEPOLIA));
        assertEq(adapter.fromNativeChainId(uint256(SEL_BASE_SEPOLIA)), CHAIN_ETH_MAINNET);

        // The old selector's reverse entry must be cleared, not left dangling.
        vm.expectRevert(abi.encodeWithSelector(Errors.UNKNOWN_NATIVE_CHAIN_ID.selector, uint256(SEL_ETH_MAINNET)));
        adapter.fromNativeChainId(uint256(SEL_ETH_MAINNET));
    }

    function test_setChainSelectors_zeroSelectorClearsLaneBothDirections() public {
        _grantAllPermissions();

        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_ETH_MAINNET;
        uint64[] memory sels = new uint64[](1);
        sels[0] = 0;
        adapter.setChainSelectors(ids, sels);

        vm.expectRevert(abi.encodeWithSelector(Errors.UNKNOWN_CHAIN_ID.selector, CHAIN_ETH_MAINNET));
        adapter.toNativeChainId(CHAIN_ETH_MAINNET);

        vm.expectRevert(abi.encodeWithSelector(Errors.UNKNOWN_NATIVE_CHAIN_ID.selector, uint256(SEL_ETH_MAINNET)));
        adapter.fromNativeChainId(uint256(SEL_ETH_MAINNET));
    }

    // =========================================================================
    // d) `sendMessage` can ONLY be reached via `delegatecall` from the controller
    // =========================================================================

    /// @dev THE core guard of the redesign. `onlyDelegatecallFromController`
    ///      checks `address(this) == CROSS_CHAIN_CONTROLLER`, NOT `msg.sender`
    ///      -- so `vm.prank(address(controller))` does nothing here; a direct
    ///      call to the adapter always has `address(this) == address(adapter)`.
    ///      This matters because a direct call would (a) spend the ADAPTER's
    ///      own (normally empty) balance instead of the controller's, and
    ///      (b) make CCIP attribute the message to the adapter, which the far
    ///      side's `_trustedRemotes` does not trust (it trusts the
    ///      controller). Both failure modes are silent/expensive rather than
    ///      loud, so this must revert instead of degrading gracefully.
    function test_sendMessage_revertsIfCalledDirectly_evenWhenCallerIsTheController() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.SEND_PATH_NOT_DELEGATECALLED.selector, address(adapter)));
        vm.prank(address(controller));
        adapter.sendMessage(remoteAdapter, SEL_ETH_MAINNET, 200_000, "");
    }

    function test_sendMessage_revertsIfCalledDirectlyByAnybody() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.SEND_PATH_NOT_DELEGATECALLED.selector, address(adapter)));
        vm.prank(alice);
        adapter.sendMessage(remoteAdapter, SEL_ETH_MAINNET, 200_000, "");
    }

    /// @dev `RECEIVER_ADDRESS_ZERO` sits BEHIND `onlyDelegatecallFromController`.
    ///      The only production caller of `sendMessage`,
    ///      `CrossChainController.forwardMessage`, already refuses to
    ///      delegatecall with a zero receiver (`_validatedConfig` requires
    ///      `remoteAdapter != address(0)`), so this specific branch is dead
    ///      code from that entry point today. `isolationAdapter` +
    ///      `delegateCallerMock` reproduce the `address(this) ==
    ///      CROSS_CHAIN_CONTROLLER` context directly, so the check itself is
    ///      still proven to work correctly in isolation.
    function test_sendMessage_isolated_revertsIfReceiverIsZero() public {
        bytes memory data = abi.encodeCall(IBaseAdapter.sendMessage, (address(0), SEL_ETH_MAINNET, 200_000, bytes("")));

        vm.expectRevert(Errors.RECEIVER_ADDRESS_ZERO.selector);
        delegateCallerMock.delegateCall(address(isolationAdapter), data);
    }

    // =========================================================================
    // e) Fees -- the controller pays, the adapter never holds funds
    // =========================================================================

    /// @dev Regression test for the missing `forceApprove`: a naive adapter
    ///      that never approves the router would make `CCIPRouterMock`'s
    ///      `transferFrom` pull revert on zero allowance. This only passes if
    ///      the approval is actually made -- and, since the send is a
    ///      `delegatecall`, made on the CONTROLLER's allowance, which is what
    ///      the router pulls from.
    function test_sendMessage_erc20Fee_approvesRouterAndRouterPullsExactFee() public {
        _registerLane(CHAIN_ETH_MAINNET, address(erc20Adapter), remoteAdapter, SEL_ETH_MAINNET);
        uint256 feeAmount = 3 ether;
        router.setFee(feeAmount);
        feeTokenErc20.setBalance(address(controller), feeAmount);

        bytes32 messageId = controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "hello");

        assertEq(router.ccipSendCallCount(), 1);
        assertEq(feeTokenErc20.balanceOf(address(router)), feeAmount, "router must have pulled the fee");
        assertEq(messageId, router.nextMessageId());
    }

    function test_sendMessage_erc20Fee_leavesZeroStandingAllowanceOnControllerAfterSend() public {
        _registerLane(CHAIN_ETH_MAINNET, address(erc20Adapter), remoteAdapter, SEL_ETH_MAINNET);
        uint256 feeAmount = 3 ether;
        router.setFee(feeAmount);
        feeTokenErc20.setBalance(address(controller), feeAmount);

        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");

        assertEq(feeTokenErc20.allowance(address(controller), address(router)), 0);
    }

    function test_sendMessage_erc20Fee_revertsIfControllerBalanceInsufficient() public {
        _registerLane(CHAIN_ETH_MAINNET, address(erc20Adapter), remoteAdapter, SEL_ETH_MAINNET);
        uint256 feeAmount = 1 ether;
        uint256 available = 0.4 ether;
        router.setFee(feeAmount);
        feeTokenErc20.setBalance(address(controller), available);

        vm.expectRevert(
            abi.encodeWithSelector(Errors.INSUFFICIENT_FEE_BALANCE.selector, address(feeTokenErc20), feeAmount, available)
        );
        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");
    }

    function test_sendMessage_nativeFee_paysExactFeeFromControllerBalance() public {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter, SEL_ETH_MAINNET);
        uint256 feeAmount = 0.05 ether;
        router.setFee(feeAmount);
        vm.deal(address(controller), feeAmount);

        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");

        assertEq(router.lastMsgValue(), feeAmount, "router must receive exactly the quoted fee");
        assertEq(address(controller).balance, 0);
        assertEq(address(adapter).balance, 0, "adapter must never hold native funds");
    }

    function test_sendMessage_nativeFee_revertsIfControllerBalanceInsufficient() public {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter, SEL_ETH_MAINNET);
        uint256 feeAmount = 1 ether;
        uint256 available = 0.5 ether;
        router.setFee(feeAmount);
        vm.deal(address(controller), available);

        vm.expectRevert(
            abi.encodeWithSelector(Errors.INSUFFICIENT_FEE_BALANCE.selector, address(0), feeAmount, available)
        );
        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");
    }

    /// @dev `UNEXPECTED_NATIVE_VALUE` guards against native value being
    ///      stranded while an ERC20 fee is due. Like `RECEIVER_ADDRESS_ZERO`
    ///      above, it is unreachable through the real controller today,
    ///      because `forwardMessage` is not `payable`: `msg.value` inside the
    ///      delegatecalled `sendMessage` is always whatever `forwardMessage`'s
    ///      own call frame had, which can only be `0`. Exercised in isolation.
    function test_sendMessage_isolated_revertsIfNativeValueSentWhileErc20FeeTokenConfigured() public {
        bytes memory data = abi.encodeCall(
            IBaseAdapter.sendMessage,
            (remoteAdapter, SEL_ETH_MAINNET, 200_000, bytes(""))
        );

        vm.expectRevert(Errors.UNEXPECTED_NATIVE_VALUE.selector);
        delegateCallerMock.delegateCall{value: 1 ether}(address(isolationAdapter), data);
    }

    function test_quoteFee_revertsIfReceiverIsZero() public {
        vm.expectRevert(Errors.RECEIVER_ADDRESS_ZERO.selector);
        adapter.quoteFee(address(0), SEL_ETH_MAINNET, 200_000, "");
    }

    function test_quoteFee_revertsIfBridgeChainIdIsZero() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.UNKNOWN_CHAIN_ID.selector, uint256(0)));
        adapter.quoteFee(remoteAdapter, 0, 200_000, "");
    }

    function test_quoteFee_returnsRouterQuoteAndConfiguredFeeToken() public {
        router.setFee(7 ether);

        (address feeToken, uint256 fee) = erc20Adapter.quoteFee(remoteAdapter, SEL_ETH_MAINNET, 200_000, "");

        assertEq(feeToken, address(feeTokenErc20));
        assertEq(fee, 7 ether);
    }

    // =========================================================================
    // f) Config setters (receive-side only): permissioned + emit events.
    //    NOTE: `setFeeToken` is GONE -- see the fee-token-immutability section.
    // =========================================================================

    function test_setChainSelectors_revertsIfUnauthorized() public {
        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_SEPOLIA;
        uint64[] memory sels = new uint64[](1);
        sels[0] = SEL_SEPOLIA;

        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector,
                address(daoMock),
                address(adapter),
                alice,
                adapter.UPDATE_ADAPTER_CONFIG_PERMISSION_ID()
            )
        );
        vm.prank(alice);
        adapter.setChainSelectors(ids, sels);
    }

    function test_setChainSelectors_emitsEventAndUpdatesStorage() public {
        _grantAllPermissions();

        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_SEPOLIA;
        uint64[] memory sels = new uint64[](1);
        sels[0] = SEL_SEPOLIA;

        vm.expectEmit(true, true, true, true, address(adapter));
        emit ChainSelectorSet(CHAIN_SEPOLIA, SEL_SEPOLIA);
        adapter.setChainSelectors(ids, sels);

        assertEq(adapter.toNativeChainId(CHAIN_SEPOLIA), uint256(SEL_SEPOLIA));
    }

    function test_setTrustedRemotes_revertsIfUnauthorized() public {
        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_ETH_MAINNET;
        address[] memory remotes = new address[](1);
        remotes[0] = makeAddr("newRemoteController");

        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector,
                address(daoMock),
                address(adapter),
                alice,
                adapter.UPDATE_ADAPTER_CONFIG_PERMISSION_ID()
            )
        );
        vm.prank(alice);
        adapter.setTrustedRemotes(ids, remotes);
    }

    function test_setTrustedRemotes_emitsEventAndUpdatesStorage() public {
        _grantAllPermissions();

        address newRemoteController = makeAddr("newRemoteController");
        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_ETH_MAINNET;
        address[] memory remotes = new address[](1);
        remotes[0] = newRemoteController;

        vm.expectEmit(true, true, true, true, address(adapter));
        emit TrustedRemoteSet(CHAIN_ETH_MAINNET, newRemoteController);
        adapter.setTrustedRemotes(ids, remotes);

        assertEq(adapter.trustedRemote(CHAIN_ETH_MAINNET), newRemoteController);
    }

    function test_trustedRemote_returnsZeroForUnsetChain() public view {
        assertEq(adapter.trustedRemote(CHAIN_BASE), address(0));
    }

    // =========================================================================
    // g.1) `assertTrustedRemotesMatchControllers`
    // =========================================================================

    function test_assertTrustedRemotesMatchControllers_passesWhenTrustedRemoteMatchesExpectedController() public {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter, SEL_ETH_MAINNET);

        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_ETH_MAINNET;
        address[] memory expected = new address[](1);
        expected[0] = remoteController;

        adapter.assertTrustedRemotesMatchControllers(ids, expected); // must not revert
    }

    function test_assertTrustedRemotesMatchControllers_revertsWhenExpectedControllerIsWrong() public {
        address wrongExpected = makeAddr("wrongExpectedController");

        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_ETH_MAINNET;
        address[] memory expected = new address[](1);
        expected[0] = wrongExpected;

        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.TRUSTED_REMOTE_MISMATCH.selector,
                CHAIN_ETH_MAINNET,
                remoteController,
                wrongExpected
            )
        );
        adapter.assertTrustedRemotesMatchControllers(ids, expected);
    }

    function test_assertTrustedRemotesMatchControllers_revertsWhenTrustedRemoteIsUnset() public {
        // CHAIN_BASE has a selector mapping but no trusted remote configured.
        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_BASE;
        address[] memory expected = new address[](1);
        expected[0] = makeAddr("anyExpectedController");

        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.TRUSTED_REMOTE_MISMATCH.selector,
                CHAIN_BASE,
                address(0),
                expected[0]
            )
        );
        adapter.assertTrustedRemotesMatchControllers(ids, expected);
    }

    function test_assertTrustedRemotesMatchControllers_revertsOnLengthMismatch() public {
        uint256[] memory ids = new uint256[](2);
        ids[0] = CHAIN_ETH_MAINNET;
        ids[1] = CHAIN_BASE;
        address[] memory expected = new address[](1);
        expected[0] = remoteController;

        vm.expectRevert(Errors.INVALID_LENGTH_MISMATCH.selector);
        adapter.assertTrustedRemotesMatchControllers(ids, expected);
    }

    /// @dev THE canonical misconfiguration, mechanically detected: the adapter
    ///      was set up trusting the remote ADAPTER (copy-pasted from
    ///      `chainToAdapter[].remoteAdapter`) instead of the remote
    ///      CONTROLLER. `expected` is deliberately set equal to the (wrong)
    ///      trusted value so the plain mismatch check does not fire first --
    ///      isolating the `TRUSTED_REMOTE_IS_REMOTE_ADAPTER` branch.
    function test_assertTrustedRemotesMatchControllers_revertsWhenTrustedRemoteIsRemoteAdapter() public {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter, SEL_ETH_MAINNET);

        _grantAllPermissions();
        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_ETH_MAINNET;
        address[] memory misconfiguredTrustedRemotes = new address[](1);
        misconfiguredTrustedRemotes[0] = remoteAdapter; // WRONG: should be remoteController.
        adapter.setTrustedRemotes(ids, misconfiguredTrustedRemotes);

        address[] memory expected = new address[](1);
        expected[0] = remoteAdapter; // matches the (wrong) trusted value.

        vm.expectRevert(
            abi.encodeWithSelector(Errors.TRUSTED_REMOTE_IS_REMOTE_ADAPTER.selector, CHAIN_ETH_MAINNET, remoteAdapter)
        );
        adapter.assertTrustedRemotesMatchControllers(ids, expected);
    }

    // =========================================================================
    // g.2) `assertChainSelectorsMatchController`
    // =========================================================================

    function test_assertChainSelectorsMatchController_passesWhenInSync() public {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter, SEL_ETH_MAINNET);

        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_ETH_MAINNET;
        adapter.assertChainSelectorsMatchController(ids); // must not revert
    }

    function test_assertChainSelectorsMatchController_revertsOnDesync() public {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter, SEL_ETH_MAINNET);

        // Desync the RECEIVE-side map away from what the controller's
        // SEND-side config still says, e.g. via an incomplete `setChainSelectors`
        // rollout for a new CCIP lane version.
        _grantAllPermissions();
        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_ETH_MAINNET;
        uint64[] memory sels = new uint64[](1);
        sels[0] = SEL_BASE_SEPOLIA;
        adapter.setChainSelectors(ids, sels);

        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.CHAIN_ID_DESYNC.selector,
                CHAIN_ETH_MAINNET,
                SEL_ETH_MAINNET,
                SEL_BASE_SEPOLIA
            )
        );
        adapter.assertChainSelectorsMatchController(ids);
    }

    function test_assertChainSelectorsMatchController_revertsWhenControllerHasNoLane() public {
        // CHAIN_BASE has an adapter-side selector (from `setUp`) but no
        // controller lane was ever registered for it.
        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_BASE;

        vm.expectRevert(abi.encodeWithSelector(Errors.ADAPTER_NOT_CONFIGURED.selector, CHAIN_BASE));
        adapter.assertChainSelectorsMatchController(ids);
    }

    function test_assertChainSelectorsMatchController_revertsWhenAdapterHasNoEntry() public {
        // Controller lane registered for CHAIN_SEPOLIA, but the adapter's own
        // selector map was never told about it.
        _registerLane(CHAIN_SEPOLIA, address(adapter), remoteAdapter, SEL_SEPOLIA);

        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_SEPOLIA;

        vm.expectRevert(abi.encodeWithSelector(Errors.UNKNOWN_CHAIN_ID.selector, CHAIN_SEPOLIA));
        adapter.assertChainSelectorsMatchController(ids);
    }

    /// @dev Demonstrates what a desync actually DOES, not just that it is
    ///      detected: the SEND path only ever consults the controller's
    ///      `bridgeChainId`. Even though the adapter's own map still says
    ///      `SEL_ETH_MAINNET` for `CHAIN_ETH_MAINNET`, pointing the controller's
    ///      lane at a different selector sends there instead -- the adapter's
    ///      receive-side storage is not read at all on send.
    function test_desyncedChainSelectors_sendGoesToControllersSelector_ignoringAdapterMap() public {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter, SEL_BASE_SEPOLIA);

        uint256 feeAmount = 0.01 ether;
        router.setFee(feeAmount);
        vm.deal(address(controller), feeAmount);

        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");

        assertEq(
            router.lastDestChainSelector(),
            SEL_BASE_SEPOLIA,
            "send must use the controller's bridgeChainId, not the adapter's own selector map"
        );
        assertEq(adapter.toNativeChainId(CHAIN_ETH_MAINNET), uint256(SEL_ETH_MAINNET), "adapter's own map is untouched");
    }

    // =========================================================================
    // h) ERC-165
    // =========================================================================

    function test_supportsInterface_IAny2EVMMessageReceiver() public view {
        assertTrue(adapter.supportsInterface(type(IAny2EVMMessageReceiver).interfaceId));
    }

    function test_supportsInterface_IERC165() public view {
        assertTrue(adapter.supportsInterface(type(IERC165).interfaceId));
    }

    function test_supportsInterface_returnsFalseForUnknownInterface() public view {
        assertFalse(adapter.supportsInterface(0xdeadbeef));
    }

    // =========================================================================
    // i) End-to-end: controller.forwardMessage -> [delegatecall] adapter -> router
    // =========================================================================

    function test_forwardMessage_endToEnd_routesThroughAdapterToRouter() public {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter, SEL_ETH_MAINNET);

        uint256 feeAmount = 0.02 ether;
        router.setFee(feeAmount);
        vm.deal(address(controller), feeAmount);

        bytes32 expectedMessageId = keccak256("expected-message-id");
        router.setNextMessageId(expectedMessageId);

        bytes memory payload = _emptyActionsPayload();
        uint256 gasLimit = 300_000;

        bytes32 messageId = controller.forwardMessage(CHAIN_ETH_MAINNET, gasLimit, payload);

        assertEq(messageId, expectedMessageId, "controller must surface the router's messageId");

        address decodedReceiver = abi.decode(router.lastReceiver(), (address));
        assertEq(decodedReceiver, remoteAdapter, "router must target the remote adapter");
        assertEq(router.lastData(), payload);
        assertEq(router.lastFeeToken(), address(0));
        assertEq(router.lastDestChainSelector(), SEL_ETH_MAINNET);
        assertEq(router.lastMsgValue(), feeAmount);
        assertEq(router.lastCaller(), address(controller), "CCIP must see the controller as the sender under delegatecall");

        bytes memory expectedExtraArgs = Client._argsToBytes(
            Client.GenericExtraArgsV2({gasLimit: gasLimit, allowOutOfOrderExecution: true})
        );
        assertEq(router.lastExtraArgs(), expectedExtraArgs, "extraArgs must encode the requested gas limit");
    }

    // =========================================================================
    // j) Constructor validation
    // =========================================================================

    function test_constructor_revertsIfRouterIsZeroAddress() public {
        uint256[] memory empty;
        address[] memory emptyAddr;

        vm.expectRevert(Errors.ZERO_ADDRESS.selector);
        new CCIPAdapter(address(controller), address(0), address(0), empty, emptyAddr, empty, new uint64[](0));
    }

    function test_constructor_revertsOnTrustedRemoteLengthMismatch() public {
        uint256[] memory chainIds = new uint256[](2);
        chainIds[0] = CHAIN_ETH_MAINNET;
        chainIds[1] = CHAIN_BASE;
        address[] memory remotes = new address[](1);
        remotes[0] = remoteController;

        vm.expectRevert(Errors.INVALID_LENGTH_MISMATCH.selector);
        new CCIPAdapter(
            address(controller),
            address(router),
            address(0),
            chainIds,
            remotes,
            new uint256[](0),
            new uint64[](0)
        );
    }

    function test_constructor_revertsOnSelectorLengthMismatch() public {
        uint256[] memory selChainIds = new uint256[](2);
        selChainIds[0] = CHAIN_ETH_MAINNET;
        selChainIds[1] = CHAIN_BASE;
        uint64[] memory sels = new uint64[](1);
        sels[0] = SEL_ETH_MAINNET;

        vm.expectRevert(Errors.INVALID_LENGTH_MISMATCH.selector);
        new CCIPAdapter(
            address(controller),
            address(router),
            address(0),
            new uint256[](0),
            new address[](0),
            selChainIds,
            sels
        );
    }

    function test_constructor_wiresUpConfiguredTrustedRemoteControllerAndSelector() public view {
        assertEq(adapter.trustedRemote(CHAIN_ETH_MAINNET), remoteController);
        assertEq(adapter.toNativeChainId(CHAIN_ETH_MAINNET), uint256(SEL_ETH_MAINNET));
    }

    // =========================================================================
    // k.1) Immutables resolve correctly under `delegatecall` -- the
    //      load-bearing assumption of the whole redesign.
    // =========================================================================

    /// @dev Under a naive design where the fee token was a regular storage
    ///      variable, this same `delegatecall` would read the CONTROLLER's
    ///      slot (whatever happens to live there) instead of the adapter's
    ///      configured fee token, and would very likely observe `address(0)`
    ///      (native) even though an ERC20 fee token was configured -- a
    ///      silent, wrong-currency bridge send. `FEE_TOKEN` being `immutable`
    ///      means it is baked into the adapter's bytecode and resolves
    ///      identically no matter whose storage is in scope.
    function test_immutables_feeTokenAndRouterSurviveDelegatecall_notMisreadAsControllerStorage() public {
        _registerLane(CHAIN_ETH_MAINNET, address(erc20Adapter), remoteAdapter, SEL_ETH_MAINNET);

        uint256 feeAmount = 2 ether;
        router.setFee(feeAmount);
        feeTokenErc20.setBalance(address(controller), feeAmount);

        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");

        assertEq(router.lastFeeToken(), address(feeTokenErc20), "immutable FEE_TOKEN must survive delegatecall");
        assertEq(router.lastCaller(), address(controller), "CCIP_ROUTER must see the controller as caller");
    }

    /// @dev Two adapters, two ERC20 fee tokens, two routers: a send through
    ///      lane A must resolve adapter A's OWN immutables and hit ONLY
    ///      router A. If the immutables were ever misread against the
    ///      controller's storage, this would either hit the wrong router or
    ///      silently agree by coincidence -- using two independent routers
    ///      rules the coincidence out.
    function test_immutables_twoAdaptersRouteExclusivelyToTheirOwnRouterAndFeeToken() public {
        CCIPRouterMock routerB = new CCIPRouterMock();
        ERC20Mock feeTokenB = new ERC20Mock("Fee Token B", "FEEB");
        CCIPAdapter adapterB = new CCIPAdapter(
            address(controller),
            address(routerB),
            address(feeTokenB),
            new uint256[](0),
            new address[](0),
            new uint256[](0),
            new uint64[](0)
        );

        _registerLane(CHAIN_ETH_MAINNET, address(erc20Adapter), remoteAdapter, SEL_ETH_MAINNET); // -> router (lane A)
        _registerLane(CHAIN_BASE, address(adapterB), remoteAdapter, SEL_BASE); // -> routerB (lane B)

        router.setFee(1 ether);
        routerB.setFee(2 ether);
        feeTokenErc20.setBalance(address(controller), 1 ether);
        feeTokenB.setBalance(address(controller), 2 ether);

        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");

        assertEq(router.ccipSendCallCount(), 1);
        assertEq(router.lastFeeToken(), address(feeTokenErc20));
        assertEq(routerB.ccipSendCallCount(), 0, "lane A's send must not touch router B at all");
    }

    // =========================================================================
    // k.2) No storage collision with the controller.
    // =========================================================================

    /// @dev Snapshots the controller's storage byte-for-byte around a
    ///      successful `forwardMessage`, using the REAL `CCIPAdapter` (not a
    ///      mock). Slots verified with:
    ///        `forge inspect .../CrossChainController.sol:CrossChainController storageLayout`
    ///      -> slot 0 `chainToAdapter`, slot 1 `_localAdapterLaneCount`, slot 2
    ///      `_failedMessages`, plus the derived element slots for the specific
    ///      chain id / adapter this send touches. Also checks the adapter's
    ///      OWN storage (a completely different address) is untouched, which
    ///      is trivially guaranteed by `delegatecall` semantics as long as the
    ///      controller never issues a plain `call` into the adapter -- worth
    ///      asserting so a future refactor that broke this would be caught.
    function test_forwardMessage_doesNotCollideWithControllerStorage() public {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter, SEL_ETH_MAINNET);

        uint256 feeAmount = 0.02 ether;
        router.setFee(feeAmount);
        vm.deal(address(controller), feeAmount);

        bytes32 chainConfigSlotA = keccak256(abi.encode(CHAIN_ETH_MAINNET, uint256(0)));
        bytes32 chainConfigSlotB = bytes32(uint256(chainConfigSlotA) + 1);
        bytes32 laneCountSlot = keccak256(abi.encode(address(adapter), uint256(1)));

        bytes32 slot0Before = vm.load(address(controller), bytes32(uint256(0)));
        bytes32 slot1Before = vm.load(address(controller), bytes32(uint256(1)));
        bytes32 slot2Before = vm.load(address(controller), bytes32(uint256(2)));
        bytes32 chainConfigABefore = vm.load(address(controller), chainConfigSlotA);
        bytes32 chainConfigBBefore = vm.load(address(controller), chainConfigSlotB);
        bytes32 laneCountBefore = vm.load(address(controller), laneCountSlot);

        address trustedRemoteBefore = adapter.trustedRemote(CHAIN_ETH_MAINNET);
        uint256 nativeChainIdBefore = adapter.toNativeChainId(CHAIN_ETH_MAINNET);

        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");

        assertEq(vm.load(address(controller), bytes32(uint256(0))), slot0Before, "slot 0 mutated by send");
        assertEq(vm.load(address(controller), bytes32(uint256(1))), slot1Before, "slot 1 mutated by send");
        assertEq(vm.load(address(controller), bytes32(uint256(2))), slot2Before, "slot 2 mutated by send");
        assertEq(
            vm.load(address(controller), chainConfigSlotA),
            chainConfigABefore,
            "chainToAdapter[chainId] slot A mutated by send"
        );
        assertEq(
            vm.load(address(controller), chainConfigSlotB),
            chainConfigBBefore,
            "chainToAdapter[chainId] slot B mutated by send"
        );
        assertEq(
            vm.load(address(controller), laneCountSlot),
            laneCountBefore,
            "_localAdapterLaneCount[adapter] slot mutated by send"
        );

        assertEq(adapter.trustedRemote(CHAIN_ETH_MAINNET), trustedRemoteBefore, "adapter's own storage touched by send");
        assertEq(
            adapter.toNativeChainId(CHAIN_ETH_MAINNET),
            nativeChainIdBefore,
            "adapter's own selector-map storage touched by send"
        );
    }

    // =========================================================================
    // k.3) The DELEGATE_CALL_FORBIDDEN receive-path guard.
    // =========================================================================

    /// @dev Proves that reaching the RECEIVE path under `delegatecall` reverts.
    ///      `delegateCallerMock` has NO storage of its own for `_trustedRemotes`
    ///      / `_selectorToChainId`, so those checks would revert first unless
    ///      fake entries are planted at the exact slots
    ///      `forge inspect .../CCIPAdapter.sol:CCIPAdapter storageLayout`
    ///      reports (slot 0 `_trustedRemotes`, slot 2 `_selectorToChainId`) --
    ///      done here via `vm.store` so execution genuinely reaches
    ///      `_forwardMessage` and trips `DELEGATE_CALL_FORBIDDEN` specifically,
    ///      rather than failing earlier for an unrelated reason.
    function test_ccipReceive_delegatecalledIntoAdapter_revertsWithDelegateCallForbidden() public {
        uint256 fakeOriginChainId = 777;
        address fakeTrustedSender = makeAddr("fakeTrustedSenderForDelegatecallProbe");

        // `_selectorToChainId[SEL_ETH_MAINNET] = fakeOriginChainId` at slot 2,
        // computed against `delegateCallerMock`'s own (otherwise empty) storage.
        bytes32 selectorToChainIdSlot = keccak256(abi.encode(uint256(SEL_ETH_MAINNET), uint256(2)));
        vm.store(address(delegateCallerMock), selectorToChainIdSlot, bytes32(fakeOriginChainId));

        // `_trustedRemotes[fakeOriginChainId] = fakeTrustedSender` at slot 0.
        bytes32 trustedRemoteSlot = keccak256(abi.encode(fakeOriginChainId, uint256(0)));
        vm.store(address(delegateCallerMock), trustedRemoteSlot, bytes32(uint256(uint160(fakeTrustedSender))));

        Client.Any2EVMMessage memory message = _buildInbound(SEL_ETH_MAINNET, fakeTrustedSender, "");

        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.DELEGATE_CALL_FORBIDDEN.selector,
                address(delegateCallerMock), // address(this) during the delegatecalled execution
                address(adapter) // the adapter's immutable `_selfAddress`
            )
        );
        vm.prank(address(router)); // `onlyRouter` checks msg.sender, preserved across delegatecall.
        delegateCallerMock.delegateCall(address(adapter), abi.encodeCall(CCIPAdapter.ccipReceive, (message)));
    }

    // =========================================================================
    // k.4) Fee-token immutability trade-off: no `setFeeToken`.
    // =========================================================================

    /// @dev There is no setter to rotate `FEE_TOKEN` -- it is `immutable` by
    ///      necessity (see `CCIPAdapter`'s contract-level docs). Rotating the
    ///      fee token for a lane means deploying a SECOND `CCIPAdapter` with
    ///      the new `FEE_TOKEN` and repointing the lane via
    ///      `CrossChainController.updateConfig`, which correctly de-registers
    ///      the old local adapter (refcounted) and registers the new one.
    function test_feeTokenRotation_requiresDeployingANewAdapterAndRepointingTheLane() public {
        ERC20Mock newFeeToken = new ERC20Mock("New Fee Token", "NEWFEE");
        CCIPAdapter newAdapter = new CCIPAdapter(
            address(controller),
            address(router),
            address(newFeeToken),
            new uint256[](0),
            new address[](0),
            new uint256[](0),
            new uint64[](0)
        );

        // Old lane, old fee token: works today.
        _registerLane(CHAIN_ETH_MAINNET, address(erc20Adapter), remoteAdapter, SEL_ETH_MAINNET);
        assertTrue(controller.isRegisteredLocalAdapter(address(erc20Adapter)));

        router.setFee(1 ether);
        feeTokenErc20.setBalance(address(controller), 1 ether);
        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");
        assertEq(router.lastFeeToken(), address(feeTokenErc20));

        // Rotate: repoint the SAME chain id at the new adapter/fee token.
        _registerLane(CHAIN_ETH_MAINNET, address(newAdapter), remoteAdapter, SEL_ETH_MAINNET);

        assertFalse(
            controller.isRegisteredLocalAdapter(address(erc20Adapter)),
            "old adapter must lose the right to call receiveMessage once its last lane is repointed"
        );
        assertTrue(controller.isRegisteredLocalAdapter(address(newAdapter)));

        router.setFee(1 ether);
        newFeeToken.setBalance(address(controller), 1 ether);
        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");
        assertEq(router.lastFeeToken(), address(newFeeToken), "send must now use the new adapter's fee token");
    }
}
