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
import {CrossChainController} from "../../../src/common/crosschain/CrossChainController.sol";
import {Errors} from "../../../src/common/crosschain/lib/Errors.sol";
import {DaoUnauthorized} from "../../../src/common/permission/auth/auth.sol";
import {Action} from "../../../src/common/executors/IExecutor.sol";

import {DAOMock} from "../../mocks/commons/dao/DAOMock.sol";
import {ERC20Mock} from "../../mocks/commons/token/ERC20Mock.sol";
import {CCIPRouterMock} from "../../mocks/commons/crosschain/CCIPRouterMock.sol";

/// @notice Regression suite for `CCIPAdapter` (`src/common/crosschain/adapters/CCIP/CCIPAdapter.sol`)
///         written against the just-hardened cross-chain adapter code.
///
/// Setup mirrors production wiring: a `DAOMock` owns a real `CrossChainController`,
/// and the `CCIPAdapter` adopts that controller's DAO in its constructor
/// (`BaseAdapter` -> `DaoAuthorizable`). The controller invokes the adapter with a
/// plain `call`, so CCIP sees the ADAPTER as the message sender on the remote
/// chain — `_trustedRemotes[chainId]` therefore holds the REMOTE ADAPTER address,
/// which is exactly what `CrossChainController.chainToAdapter[chainId].remoteAdapter`
/// stores for the local->remote lane.
///
/// Coverage locks in the security-review regressions:
///  a) `_forwardMessage` is not externally callable (was `public` pre-hardening).
///  b) `ccipReceive` caller / trusted-remote checks and the success path.
///  c) chain-id <-> CCIP-selector mapping now reverts instead of silently
///     mapping to chain `0`.
///  d) `sendMessage` caller / receiver guards.
///  e) fee handling: ERC20 fee approval (the missing-`forceApprove` bug),
///     leftover-return, and native/ERC20 edge cases.
///  f) config setters are permissioned and emit events.
///  g) `assertTrustedRemotesMatchController` deployment sanity check.
///  h) ERC-165 `supportsInterface`.
///  i) an end-to-end send through `CrossChainController.forwardMessage`.
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
    // Events re-declared locally so `vm.expectEmit` can match by signature.
    // -------------------------------------------------------------------------
    event FeeTokenSet(address feeToken);
    event ChainSelectorSet(uint256 indexed chainId, uint64 chainSelector);
    event TrustedRemoteSet(uint256 indexed chainId, address trustedRemote);
    event MessageReceived(uint256 indexed originChainId, bytes32 indexed messageId, bytes32 indexed callId);

    DAOMock internal daoMock;
    CrossChainController internal controller;
    CCIPRouterMock internal router;
    ERC20Mock internal feeTokenErc20;
    CCIPAdapter internal adapter;

    address internal alice;
    /// @dev The remote-chain ADAPTER address trusted for `CHAIN_ETH_MAINNET`.
    address internal remoteAdapter;

    function setUp() public {
        alice = makeAddr("alice");
        remoteAdapter = makeAddr("remoteAdapter");

        daoMock = new DAOMock();
        controller = new CrossChainController(address(daoMock));
        router = new CCIPRouterMock();
        feeTokenErc20 = new ERC20Mock("Fee Token", "FEE");

        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = CHAIN_ETH_MAINNET;
        address[] memory trustedRemotes = new address[](1);
        trustedRemotes[0] = remoteAdapter;

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
            address(0), // native fee token by default
            chainIds,
            trustedRemotes,
            selChainIds,
            selectors
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

    function _setFeeToken(address token) internal {
        _grantAllPermissions();
        adapter.setFeeToken(token);
    }

    /// @dev Registers `localAdapter`/`remote` as the controller's adapter pair
    ///      for `chainId`, granting the adapter the right to call
    ///      `receiveMessage` and enabling `forwardMessage`/`quoteFee` for it.
    function _registerLane(uint256 chainId, address localAdapter, address remote) internal {
        _grantAllPermissions();
        uint256[] memory ids = new uint256[](1);
        ids[0] = chainId;
        CrossChainController.AdapterByChain[] memory pairs = new CrossChainController.AdapterByChain[](1);
        pairs[0] = CrossChainController.AdapterByChain({localAdapter: localAdapter, remoteAdapter: remote});
        controller.updateConfig(ids, pairs);
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

    // =========================================================================
    // a) `_forwardMessage` must not be externally callable.
    // =========================================================================

    /// @dev The pre-hardening code had `_forwardMessage` `public`, letting
    ///      anyone inject an arbitrary payload/origin chain straight into the
    ///      controller's `receiveMessage`, bypassing both the `onlyRouter`
    ///      check and the trusted-remote check in `ccipReceive`. It is now
    ///      `internal` on `BaseAdapter`; `adapter._forwardMessage(...)` does
    ///      not even compile from outside the contract, and there is no
    ///      selector for it in the adapter's ABI. This test proves the
    ///      low-level fallback path is closed too: a raw call with the old
    ///      function's signature does not reach any code (the adapter has no
    ///      fallback function), so it must simply fail.
    function test_forwardMessage_isNotExternallyCallable() public {
        (bool success, bytes memory returndata) = address(adapter).call(
            abi.encodeWithSignature(
                "_forwardMessage(bytes32,bytes,uint256)",
                bytes32(0),
                bytes(""),
                CHAIN_ETH_MAINNET
            )
        );

        assertFalse(success, "_forwardMessage must not be externally callable");
        assertEq(returndata.length, 0, "no fallback exists to handle the unmatched selector");
    }

    // =========================================================================
    // b) `ccipReceive`
    // =========================================================================

    function test_ccipReceive_revertsIfCallerNotRouter() public {
        Client.Any2EVMMessage memory message = _buildInbound(SEL_ETH_MAINNET, remoteAdapter, "");

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

    function test_ccipReceive_revertsIfSenderNotConfiguredTrustedRemote() public {
        address untrusted = makeAddr("untrusted");
        Client.Any2EVMMessage memory message = _buildInbound(SEL_ETH_MAINNET, untrusted, "");

        vm.expectRevert(Errors.REMOTE_NOT_TRUSTED.selector);
        vm.prank(address(router));
        adapter.ccipReceive(message);
    }

    function test_ccipReceive_succeedsForTrustedRemoteAndForwardsToController() public {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter);

        Action[] memory actions = new Action[](0);
        bytes memory payload = abi.encode(actions);
        bytes32 messageId = keccak256("msg-1");

        Client.Any2EVMMessage memory message = _buildInbound(SEL_ETH_MAINNET, remoteAdapter, payload);
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

    /// @dev A message arriving from a selector that was never mapped to a
    ///      standard chain id must revert, not be silently treated as
    ///      originating from chain `0`.
    function test_ccipReceive_revertsForUnmappedSourceSelector() public {
        Client.Any2EVMMessage memory message = _buildInbound(SEL_SEPOLIA, remoteAdapter, "");

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

        // The old selector's reverse entry must be cleared, not left dangling
        // (which would let a message with the stale selector be misattributed).
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
    // d) `sendMessage` caller / receiver guards
    // =========================================================================

    function test_sendMessage_revertsIfCallerNotController() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.CALLER_NOT_CROSS_CHAIN_CONTROLLER.selector, alice));
        vm.prank(alice);
        adapter.sendMessage(remoteAdapter, 200_000, CHAIN_ETH_MAINNET, "");
    }

    function test_sendMessage_revertsIfReceiverIsZero() public {
        vm.expectRevert(Errors.RECEIVER_ADDRESS_ZERO.selector);
        vm.prank(address(controller));
        adapter.sendMessage(address(0), 200_000, CHAIN_ETH_MAINNET, "");
    }

    // =========================================================================
    // e) Fees
    // =========================================================================

    /// @dev Regression test for the missing `forceApprove`: the old adapter
    ///      never approved the router, so `CCIPRouterMock.ccipSend`'s
    ///      `transferFrom` pull would revert on zero allowance. This test only
    ///      passes if the adapter actually approves the router first.
    function test_sendMessage_erc20Fee_approvesRouterAndRouterPullsExactFee() public {
        _setFeeToken(address(feeTokenErc20));
        uint256 feeAmount = 3 ether;
        router.setFee(feeAmount);
        feeTokenErc20.setBalance(address(adapter), feeAmount);

        vm.prank(address(controller));
        bytes32 messageId = adapter.sendMessage(remoteAdapter, 200_000, CHAIN_ETH_MAINNET, "hello");

        assertEq(router.ccipSendCallCount(), 1);
        assertEq(feeTokenErc20.balanceOf(address(router)), feeAmount, "router must have pulled the fee");
        assertEq(messageId, router.nextMessageId());
    }

    function test_sendMessage_erc20Fee_leavesZeroStandingAllowanceAfterSend() public {
        _setFeeToken(address(feeTokenErc20));
        uint256 feeAmount = 3 ether;
        router.setFee(feeAmount);
        feeTokenErc20.setBalance(address(adapter), feeAmount);

        vm.prank(address(controller));
        adapter.sendMessage(remoteAdapter, 200_000, CHAIN_ETH_MAINNET, "");

        assertEq(feeTokenErc20.allowance(address(adapter), address(router)), 0);
    }

    function test_sendMessage_erc20Fee_returnsLeftoverBalanceToController() public {
        _setFeeToken(address(feeTokenErc20));
        uint256 feeAmount = 3 ether;
        uint256 extra = 1 ether;
        router.setFee(feeAmount);
        feeTokenErc20.setBalance(address(adapter), feeAmount + extra);

        vm.prank(address(controller));
        adapter.sendMessage(remoteAdapter, 200_000, CHAIN_ETH_MAINNET, "");

        assertEq(feeTokenErc20.balanceOf(address(adapter)), 0, "adapter must not retain custody");
        assertEq(feeTokenErc20.balanceOf(address(controller)), extra, "leftover must return to controller");
    }

    function test_sendMessage_erc20Fee_revertsIfInsufficientBalance() public {
        _setFeeToken(address(feeTokenErc20));
        uint256 feeAmount = 1 ether;
        uint256 available = 0.4 ether;
        router.setFee(feeAmount);
        feeTokenErc20.setBalance(address(adapter), available);

        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.INSUFFICIENT_FEE_BALANCE.selector,
                address(feeTokenErc20),
                feeAmount,
                available
            )
        );
        vm.prank(address(controller));
        adapter.sendMessage(remoteAdapter, 200_000, CHAIN_ETH_MAINNET, "");
    }

    function test_sendMessage_revertsIfNativeValueSentWhileErc20FeeTokenConfigured() public {
        _setFeeToken(address(feeTokenErc20));
        vm.deal(address(controller), 1 ether);

        vm.expectRevert(Errors.UNEXPECTED_NATIVE_VALUE.selector);
        vm.prank(address(controller));
        adapter.sendMessage{value: 1 ether}(remoteAdapter, 200_000, CHAIN_ETH_MAINNET, "");
    }

    function test_sendMessage_nativeFee_paysExactFeeAndReturnsLeftoverToController() public {
        // Adapter defaults to native (address(0)) fee token from setUp.
        uint256 feeAmount = 0.05 ether;
        uint256 extra = 0.01 ether;
        router.setFee(feeAmount);

        // Simulate a stray pre-existing native balance on the adapter, on top
        // of the exact fee the controller hands over as `msg.value`.
        vm.deal(address(adapter), extra);
        vm.deal(address(controller), feeAmount);

        vm.prank(address(controller));
        adapter.sendMessage{value: feeAmount}(remoteAdapter, 200_000, CHAIN_ETH_MAINNET, "");

        assertEq(router.lastMsgValue(), feeAmount, "router must receive exactly the quoted fee");
        assertEq(address(adapter).balance, 0, "adapter must not retain custody");
        assertEq(address(controller).balance, extra, "leftover must return to controller");
    }

    function test_sendMessage_nativeFee_revertsIfInsufficientBalance() public {
        uint256 feeAmount = 1 ether;
        uint256 available = 0.5 ether;
        router.setFee(feeAmount);
        vm.deal(address(controller), available);

        vm.expectRevert(
            abi.encodeWithSelector(Errors.INSUFFICIENT_FEE_BALANCE.selector, address(0), feeAmount, available)
        );
        vm.prank(address(controller));
        adapter.sendMessage{value: available}(remoteAdapter, 200_000, CHAIN_ETH_MAINNET, "");
    }

    function test_quoteFee_revertsIfReceiverIsZero() public {
        vm.expectRevert(Errors.RECEIVER_ADDRESS_ZERO.selector);
        adapter.quoteFee(address(0), 200_000, CHAIN_ETH_MAINNET, "");
    }

    function test_quoteFee_returnsRouterQuoteAndConfiguredFeeToken() public {
        _setFeeToken(address(feeTokenErc20));
        router.setFee(7 ether);

        (address feeToken, uint256 fee) = adapter.quoteFee(remoteAdapter, 200_000, CHAIN_ETH_MAINNET, "");

        assertEq(feeToken, address(feeTokenErc20));
        assertEq(fee, 7 ether);
    }

    // =========================================================================
    // f) Config setters: permissioned + emit events
    // =========================================================================

    function test_setFeeToken_revertsIfUnauthorized() public {
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
        adapter.setFeeToken(address(feeTokenErc20));
    }

    function test_setFeeToken_emitsEventAndUpdatesStorage() public {
        _grantAllPermissions();

        vm.expectEmit(true, true, true, true, address(adapter));
        emit FeeTokenSet(address(feeTokenErc20));
        adapter.setFeeToken(address(feeTokenErc20));

        assertEq(adapter.feeToken(), address(feeTokenErc20));
    }

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
        remotes[0] = makeAddr("newRemote");

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

        address newRemote = makeAddr("newRemote");
        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_ETH_MAINNET;
        address[] memory remotes = new address[](1);
        remotes[0] = newRemote;

        vm.expectEmit(true, true, true, true, address(adapter));
        emit TrustedRemoteSet(CHAIN_ETH_MAINNET, newRemote);
        adapter.setTrustedRemotes(ids, remotes);

        assertEq(adapter.trustedRemote(CHAIN_ETH_MAINNET), newRemote);
    }

    function test_trustedRemote_returnsZeroForUnsetChain() public view {
        assertEq(adapter.trustedRemote(CHAIN_BASE), address(0));
    }

    // =========================================================================
    // g) `assertTrustedRemotesMatchController`
    // =========================================================================

    function test_assertTrustedRemotesMatchController_passesWhenBothSidesAgree() public {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter);

        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_ETH_MAINNET;
        adapter.assertTrustedRemotesMatchController(ids); // must not revert
    }

    function test_assertTrustedRemotesMatchController_revertsWhenMismatched() public {
        address controllerConfiguredRemote = makeAddr("controllerConfiguredRemote");
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), controllerConfiguredRemote);

        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_ETH_MAINNET;

        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.TRUSTED_REMOTE_MISMATCH.selector,
                CHAIN_ETH_MAINNET,
                remoteAdapter,
                controllerConfiguredRemote
            )
        );
        adapter.assertTrustedRemotesMatchController(ids);
    }

    function test_assertTrustedRemotesMatchController_revertsWhenControllerLaneUnconfigured() public {
        // No `updateConfig` call: the controller's `remoteAdapter` for this
        // chain stays `address(0)` while the adapter already trusts `remoteAdapter`.
        uint256[] memory ids = new uint256[](1);
        ids[0] = CHAIN_ETH_MAINNET;

        vm.expectRevert(
            abi.encodeWithSelector(Errors.TRUSTED_REMOTE_MISMATCH.selector, CHAIN_ETH_MAINNET, remoteAdapter, address(0))
        );
        adapter.assertTrustedRemotesMatchController(ids);
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
    // i) End-to-end-ish: controller.forwardMessage -> adapter.sendMessage -> router
    // =========================================================================

    function test_forwardMessage_endToEnd_routesThroughAdapterToRouter() public {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter);

        uint256 feeAmount = 0.02 ether;
        router.setFee(feeAmount);
        vm.deal(address(controller), feeAmount);

        bytes32 expectedMessageId = keccak256("expected-message-id");
        router.setNextMessageId(expectedMessageId);

        Action[] memory actions = new Action[](0);
        bytes memory payload = abi.encode(actions);
        uint256 gasLimit = 300_000;

        bytes32 messageId = controller.forwardMessage(CHAIN_ETH_MAINNET, gasLimit, payload);

        assertEq(messageId, expectedMessageId, "controller must surface the router's messageId");

        address decodedReceiver = abi.decode(router.lastReceiver(), (address));
        assertEq(decodedReceiver, remoteAdapter, "router must target the remote adapter");
        assertEq(router.lastData(), payload);
        assertEq(router.lastFeeToken(), address(0));
        assertEq(router.lastDestChainSelector(), SEL_ETH_MAINNET);
        assertEq(router.lastMsgValue(), feeAmount);

        bytes memory expectedExtraArgs = Client._argsToBytes(
            Client.GenericExtraArgsV2({gasLimit: gasLimit, allowOutOfOrderExecution: true})
        );
        assertEq(router.lastExtraArgs(), expectedExtraArgs, "extraArgs must encode the requested gas limit");
    }

    // =========================================================================
    // Constructor validation (bonus coverage)
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
        remotes[0] = remoteAdapter;

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

    function test_constructor_wiresUpConfiguredTrustedRemoteAndSelector() public view {
        assertEq(adapter.trustedRemote(CHAIN_ETH_MAINNET), remoteAdapter);
        assertEq(adapter.toNativeChainId(CHAIN_ETH_MAINNET), uint256(SEL_ETH_MAINNET));
    }
}
