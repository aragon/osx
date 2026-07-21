// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Vm} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

import {DAO} from "../../../../src/core/dao/DAO.sol";
import {Action} from "../../../../src/common/executors/IExecutor.sol";
import {CrossChainController} from "../../../../src/common/crosschain/CrossChainController.sol";
import {CCIPAdapter} from "../../../../src/common/crosschain/adapters/CCIP/CCIPAdapter.sol";
import {Errors} from "../../../../src/common/crosschain/lib/Errors.sol";

import {CrossChainStackFixture} from "../CrossChainStackFixture.sol";

/// @dev Destination-side sink; the fork test asserts on ITS state to prove the
///      destination DAO really executed the delivered payload.
contract ForkTarget {
    uint256 public cancelCount;
    address public lastCaller;

    function cancelRootUpdate() external {
        cancelCount++;
        lastCaller = msg.sender;
    }
}

/// @notice Fork tests that run the cross-chain module against the REAL,
///         production Chainlink CCIP Router bytecode.
///
/// @dev WHAT THIS PROVES — and, just as importantly, WHAT IT DOES NOT.
///
///      PROVEN here:
///      - our `Client.EVM2AnyMessage` is well-formed enough that the real
///        mainnet Router's `getFee` prices it, i.e. our `extraArgs`
///        (`GenericExtraArgsV2` with an explicit gas limit and
///        `allowOutOfOrderExecution`) is accepted by the production OnRamp
///        rather than silently defaulting or reverting;
///      - a real `ccipSend` is ACCEPTED by the real Router — the request is
///        admitted, a non-zero message id is returned and the OnRamp emits its
///        send event. This is what validates our calldata encoding, the native
///        fee payment out of the CONTROLLER's balance (the `delegatecall`
///        consequence), and the ERC20 fee path's `forceApprove` against real
///        Router bytecode rather than a mock that we wrote ourselves;
///      - on a real destination chain, the destination stack accepts a
///        `Client.Any2EVMMessage` delivered by the REAL Router address and the
///        destination DAO executes the `Action[]` — including the trusted-remote
///        check resolving the origin CONTROLLER (not the origin adapter).
///
///      NOT PROVEN here, and no fork test can prove it:
///      - the DON transport itself. Nothing here waits for, or exercises,
///        committing/blessing/execution by the Chainlink oracle network.
///      - that the lane is enabled, un-cursed and within its rate limits at the
///        moment you deploy. `getFee` succeeding implies the lane exists at the
///        forked block; it says nothing about RMN curses or future config.
///      - real delivery latency, gas-limit sufficiency on the destination under
///        production block conditions, or manual-execution behaviour after the
///        smart-execution window.
///      The destination half of `test_fork_...RoundTrip` is a `vm.prank` of the
///      real Router address. It proves our RECEIVER is correct; it does not
///      prove anything about who is able to make that call in production.
///
///      GATING. Excluded from CI by `forge test --no-match-path '**/fork/**'`
///      (see `.github/workflows/test.yml`). When run outside that filter the
///      tests skip cleanly unless the RPC env vars are set:
///        RPC_URL       (or MAINNET_RPC_URL) — an Ethereum mainnet endpoint
///        BASE_RPC_URL  — a Base mainnet endpoint (destination half only)
///      Run with: `RPC_URL=... BASE_RPC_URL=... forge test --match-path "test/integration/crosschain/fork/*"`
contract CCIPRouterForkTest is CrossChainStackFixture {
    // -- Verified against https://docs.chain.link/ccip/directory (2026-07-21),
    //    and re-checked on-chain via `typeAndVersion()` == "Router 1.2.0".
    address internal constant MAINNET_CCIP_ROUTER = 0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D;
    address internal constant BASE_CCIP_ROUTER = 0x881e3A65B4d4a04dD529061dd0071cf975F58bCD;
    address internal constant MAINNET_LINK = 0x514910771AF9Ca656af840dff83E8264EcF986CA;

    uint64 internal constant MAINNET_SELECTOR = 5009297550715157269;
    uint64 internal constant BASE_SELECTOR = 15971525489660198786;

    uint256 internal constant MAINNET_CHAIN_ID = 1;
    uint256 internal constant BASE_CHAIN_ID = 8453;

    uint256 internal constant GAS_LIMIT = 400_000;

    address internal plugin = makeAddr("governancePlugin");

    // Carried across forks (the test contract is persistent), so the
    // destination half replays exactly what the origin half produced.
    bytes32 internal originMessageId;
    bytes internal originPayload;
    address internal originController;

    // -------------------------------------------------------------------------
    // Fork gating
    // -------------------------------------------------------------------------

    /// @dev Returns the mainnet RPC endpoint, or an empty string when unset.
    ///      `RPC_URL` matches the convention of the existing fork tests in
    ///      `test/framework/member/fork/`; `MAINNET_RPC_URL` is accepted too so
    ///      that this suite can be run alongside `BASE_RPC_URL` unambiguously.
    function _mainnetRpc() internal view returns (string memory) {
        string memory url = vm.envOr("MAINNET_RPC_URL", string(""));
        if (bytes(url).length == 0) url = vm.envOr("RPC_URL", string(""));
        return url;
    }

    function _baseRpc() internal view returns (string memory) {
        return vm.envOr("BASE_RPC_URL", string(""));
    }

    /// @dev Selects a mainnet fork, or skips the test when no endpoint is set.
    /// @return skipped True if the caller should return immediately.
    function _selectMainnetForkOrSkip() internal returns (bool skipped) {
        string memory url = _mainnetRpc();
        if (bytes(url).length == 0) {
            vm.skip(true);
            return true;
        }
        vm.createSelectFork(url);
        return false;
    }

    // -------------------------------------------------------------------------
    // Deployment helpers
    // -------------------------------------------------------------------------

    /// @dev Deploys and fully wires one chain's stack on whatever fork is
    ///      currently selected. Uses the same fixture the in-process round-trip
    ///      test uses, so both prove the same wiring.
    /// @param _label Trace label prefix.
    /// @param _router The REAL CCIP router on the selected chain.
    /// @param _feeToken The fee token; `address(0)` for native.
    /// @param _remoteChainId The counterpart chain's standard id.
    /// @param _remoteAdapter The counterpart chain's ADAPTER (bridge receiver).
    /// @param _remoteSelector The counterpart chain's CCIP selector.
    /// @param _remoteController The counterpart chain's CONTROLLER (trusted remote).
    function _deployWiredStack(
        string memory _label,
        address _router,
        address _feeToken,
        uint256 _remoteChainId,
        address _remoteAdapter,
        uint64 _remoteSelector,
        address _remoteController
    ) internal returns (Stack memory stack) {
        stack = _deployStack(
            _deployDao(_label),
            _router,
            _feeToken,
            new uint256[](0),
            new address[](0),
            _uint256s(MAINNET_CHAIN_ID, BASE_CHAIN_ID),
            _uint64s(MAINNET_SELECTOR, BASE_SELECTOR)
        );

        stack.dao.grant(address(stack.dao), plugin, EXECUTE_PERMISSION_ID);
        _grantStackPermissions(stack, address(stack.dao));

        _configureLane(stack, _remoteChainId, _remoteAdapter, _remoteSelector);
        _setTrustedRemote(stack, _remoteChainId, _remoteController);
    }

    /// @dev The payload a cross-chain veto proposal would carry.
    function _payload(address _target) internal pure returns (bytes memory) {
        Action[] memory actions = new Action[](1);
        actions[0] = Action({to: _target, value: 0, data: abi.encodeCall(ForkTarget.cancelRootUpdate, ())});
        return abi.encode(actions);
    }

    // -------------------------------------------------------------------------
    // Origin half: the real mainnet Router
    // -------------------------------------------------------------------------

    /// @notice The real Router prices our message, and the quote is sane.
    function test_fork_realRouterQuotesANonZeroSaneFee() public {
        if (_selectMainnetForkOrSkip()) return;

        Stack memory a = _deployWiredStack(
            "DAO_mainnet",
            MAINNET_CCIP_ROUTER,
            address(0),
            BASE_CHAIN_ID,
            makeAddr("remoteAdapterOnBase"),
            BASE_SELECTOR,
            makeAddr("remoteControllerOnBase")
        );

        (address feeToken, uint256 fee, uint256 available) =
            a.controller.quoteFee(BASE_CHAIN_ID, GAS_LIMIT, _payload(makeAddr("targetOnBase")));

        assertEq(feeToken, address(0), "native fee token");
        assertGt(fee, 0, "the real Router must price the message");
        // Sanity bound rather than an exact figure: the point is that we are
        // being quoted a plausible bridging fee, not gas-priced nonsense.
        assertLt(fee, 1 ether, "quote is within a plausible range");
        assertEq(available, address(a.controller).balance, "available is the CONTROLLER's balance");
    }

    /// @notice A real `ccipSend`, paid in native currency, is ACCEPTED by the
    ///         real mainnet Router when driven through a real DAO proposal.
    function test_fork_realRouterAcceptsNativeFeeSend() public {
        if (_selectMainnetForkOrSkip()) return;

        address remoteAdapter = makeAddr("remoteAdapterOnBase");
        Stack memory a = _deployWiredStack(
            "DAO_mainnet",
            MAINNET_CCIP_ROUTER,
            address(0),
            BASE_CHAIN_ID,
            remoteAdapter,
            BASE_SELECTOR,
            makeAddr("remoteControllerOnBase")
        );

        bytes memory payload = _payload(makeAddr("targetOnBase"));
        (, uint256 fee,) = a.controller.quoteFee(BASE_CHAIN_ID, GAS_LIMIT, payload);
        vm.deal(address(a.controller), fee * 2);

        uint256 balanceBefore = address(a.controller).balance;

        Action[] memory proposalActions = new Action[](1);
        proposalActions[0] = Action({
            to: address(a.controller),
            value: 0,
            data: abi.encodeCall(CrossChainController.forwardMessage, (BASE_CHAIN_ID, GAS_LIMIT, payload))
        });

        vm.recordLogs();
        vm.prank(plugin);
        a.dao.execute(keccak256("fork-proposal"), proposalActions, 0);

        (bytes32 messageId, address onRamp) = _readForwardedMessage(vm.getRecordedLogs(), address(a.controller));

        assertTrue(messageId != bytes32(0), "the real Router returned a message id");

        // The send event must have come from the production OnRamp that the
        // real Router itself routes the Base lane through — not from the Router
        // facade, and not from anything we deployed. At the time of writing
        // that is `OnRamp 1.6.0` at 0x9138...aeCa; asserting against
        // `getOnRamp` instead of a literal keeps this true across upgrades.
        (bool ok, bytes memory data) =
            MAINNET_CCIP_ROUTER.staticcall(abi.encodeWithSignature("getOnRamp(uint64)", BASE_SELECTOR));
        assertTrue(ok, "Router exposes getOnRamp");
        assertEq(onRamp, abi.decode(data, (address)), "the lane's real OnRamp emitted the send event");

        // The fee left the CONTROLLER (never the adapter) — the `delegatecall`
        // fee-payer property, now against production bytecode.
        assertEq(balanceBefore - address(a.controller).balance, fee, "fee paid from the controller, exactly the quote");
        assertEq(address(a.adapter).balance, 0, "the adapter custodies nothing");
    }

    /// @notice The ERC20 (LINK) fee path — the `forceApprove` half — is accepted
    ///         by the real Router, which pulls the fee with `transferFrom`.
    function test_fork_realRouterAcceptsLinkFeeSend() public {
        if (_selectMainnetForkOrSkip()) return;

        Stack memory a = _deployWiredStack(
            "DAO_mainnet_link",
            MAINNET_CCIP_ROUTER,
            MAINNET_LINK,
            BASE_CHAIN_ID,
            makeAddr("remoteAdapterOnBase"),
            BASE_SELECTOR,
            makeAddr("remoteControllerOnBase")
        );

        bytes memory payload = _payload(makeAddr("targetOnBase"));
        (address feeToken, uint256 fee,) = a.controller.quoteFee(BASE_CHAIN_ID, GAS_LIMIT, payload);
        assertEq(feeToken, MAINNET_LINK, "fee token is LINK");
        assertGt(fee, 0, "LINK-denominated quote is non-zero");

        deal(MAINNET_LINK, address(a.controller), fee * 2);
        uint256 balanceBefore = IERC20(MAINNET_LINK).balanceOf(address(a.controller));

        vm.prank(address(a.dao));
        bytes32 messageId = a.controller.forwardMessage(BASE_CHAIN_ID, GAS_LIMIT, payload);

        assertTrue(messageId != bytes32(0), "the real Router accepted a LINK-paid send");
        assertEq(
            balanceBefore - IERC20(MAINNET_LINK).balanceOf(address(a.controller)),
            fee,
            "the Router pulled exactly the quoted LINK from the CONTROLLER"
        );
        assertEq(
            IERC20(MAINNET_LINK).allowance(address(a.controller), MAINNET_CCIP_ROUTER),
            0,
            "no standing allowance is left behind"
        );
    }

    /// @notice Guard against a stale hard-coded router: the address we ship in
    ///         the deployment scripts must really be a CCIP Router that knows
    ///         the Base lane.
    function test_fork_routerAddressAndSelectorsAreCurrent() public {
        if (_selectMainnetForkOrSkip()) return;

        (bool ok, bytes memory data) =
            MAINNET_CCIP_ROUTER.staticcall(abi.encodeWithSignature("isChainSupported(uint64)", BASE_SELECTOR));
        assertTrue(ok && abi.decode(data, (bool)), "mainnet Router supports the Base selector");
    }

    // -------------------------------------------------------------------------
    // Destination half: the real Base Router address
    // -------------------------------------------------------------------------

    /// @notice Full loop across two real chains: send through the real mainnet
    ///         Router, then deliver what it accepted on a Base fork by
    ///         impersonating the real Base Router address.
    /// @dev The DON transport in between is NOT exercised; see the contract
    ///      docs. Everything on either side of it is.
    function test_fork_roundTripAcrossRealRouters() public {
        string memory mainnetUrl = _mainnetRpc();
        string memory baseUrl = _baseRpc();
        if (bytes(mainnetUrl).length == 0 || bytes(baseUrl).length == 0) {
            vm.skip(true);
            return;
        }

        // -- Origin: real mainnet Router ------------------------------------
        vm.createSelectFork(mainnetUrl);

        // The destination adapter's address is not known yet; on a real
        // deployment this is exactly the two-phase problem the scripts print
        // actions for. A placeholder is fine for the SEND half: CCIP only
        // encodes the receiver, it does not resolve it on the source chain.
        address plannedRemoteAdapter = makeAddr("adapterOnBase");
        address plannedRemoteController = makeAddr("controllerOnBase");

        Stack memory a = _deployWiredStack(
            "DAO_mainnet",
            MAINNET_CCIP_ROUTER,
            address(0),
            BASE_CHAIN_ID,
            plannedRemoteAdapter,
            BASE_SELECTOR,
            plannedRemoteController
        );

        address targetPlaceholder = makeAddr("targetOnBase");
        bytes memory payload = _payload(targetPlaceholder);

        (, uint256 fee,) = a.controller.quoteFee(BASE_CHAIN_ID, GAS_LIMIT, payload);
        vm.deal(address(a.controller), fee * 2);

        vm.prank(address(a.dao));
        originMessageId = a.controller.forwardMessage(BASE_CHAIN_ID, GAS_LIMIT, payload);
        originController = address(a.controller);
        assertTrue(originMessageId != bytes32(0), "real mainnet Router accepted the send");

        // -- Destination: real Base Router address ---------------------------
        vm.createSelectFork(baseUrl);

        ForkTarget target = new ForkTarget();

        Stack memory b = _deployWiredStack(
            "DAO_base",
            BASE_CCIP_ROUTER,
            address(0),
            MAINNET_CHAIN_ID,
            makeAddr("adapterOnMainnet"),
            MAINNET_SELECTOR,
            originController // the trusted remote is the origin CONTROLLER
        );

        // Rebuild the payload against the target that actually exists on this
        // fork. Everything else — message id, source selector, sender — is
        // exactly what the real mainnet Router accepted above.
        originPayload = _payload(address(target));

        Client.Any2EVMMessage memory delivered = Client.Any2EVMMessage({
            messageId: originMessageId,
            sourceChainSelector: MAINNET_SELECTOR,
            sender: abi.encode(originController),
            data: originPayload,
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        vm.prank(BASE_CCIP_ROUTER);
        b.adapter.ccipReceive(delivered);

        assertEq(target.cancelCount(), 1, "the destination DAO executed the delivered action");
        assertEq(target.lastCaller(), address(b.dao), "executed BY the destination DAO");
        assertFalse(
            b.controller.getFailedMessage(b.controller.deriveCallId(MAINNET_CHAIN_ID, originMessageId)).pending,
            "nothing stored as failed"
        );
    }

    /// @notice On the real destination chain, only the real Router may deliver,
    ///         and only the origin CONTROLLER is a trusted originator.
    function test_fork_destinationRejectsForgedDeliveries() public {
        string memory baseUrl = _baseRpc();
        if (bytes(baseUrl).length == 0) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(baseUrl);

        address trustedOriginController = makeAddr("controllerOnMainnet");
        address originAdapter = makeAddr("adapterOnMainnet");

        Stack memory b = _deployWiredStack(
            "DAO_base",
            BASE_CCIP_ROUTER,
            address(0),
            MAINNET_CHAIN_ID,
            originAdapter,
            MAINNET_SELECTOR,
            trustedOriginController
        );

        ForkTarget target = new ForkTarget();

        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: keccak256("forged"),
            sourceChainSelector: MAINNET_SELECTOR,
            sender: abi.encode(trustedOriginController),
            data: _payload(address(target)),
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        // Not the Router.
        vm.prank(makeAddr("stranger"));
        vm.expectRevert(Errors.CALLER_NOT_CCIP_ROUTER.selector);
        b.adapter.ccipReceive(message);

        // The Router, but the sender is the origin ADAPTER rather than the
        // origin CONTROLLER — the canonical misconfiguration.
        message.sender = abi.encode(originAdapter);
        vm.prank(BASE_CCIP_ROUTER);
        vm.expectRevert(Errors.REMOTE_NOT_TRUSTED.selector);
        b.adapter.ccipReceive(message);

        assertEq(target.cancelCount(), 0, "nothing executed");
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    /// @dev Pulls the controller's `MessageForwarded` message id out of the
    ///      recorded logs, and finds the address that emitted the production
    ///      OnRamp's send event (any log carrying the same message id that was
    ///      not emitted by our own contracts).
    /// @param _logs The recorded logs.
    /// @param _controller The controller that forwarded.
    /// @return messageId The bridge message id.
    /// @return onRamp The emitter of the corresponding CCIP send event.
    function _readForwardedMessage(Vm.Log[] memory _logs, address _controller)
        internal
        pure
        returns (bytes32 messageId, address onRamp)
    {
        bytes32 forwardedTopic =
            keccak256("MessageForwarded(uint256,bytes32,address,address,uint256,address,uint256)");

        for (uint256 i = 0; i < _logs.length; i++) {
            if (_logs[i].emitter == _controller && _logs[i].topics[0] == forwardedTopic) {
                messageId = _logs[i].topics[2];
                break;
            }
        }

        if (messageId == bytes32(0)) return (messageId, address(0));

        // The v1.2/v1.5 OnRamp emits `CCIPSendRequested` / `CCIPMessageSent`
        // carrying the message id somewhere in its payload. Rather than pinning
        // a struct layout that Chainlink revises between CCIP versions, look
        // for any foreign log whose data contains the id.
        for (uint256 i = 0; i < _logs.length; i++) {
            if (_logs[i].emitter == _controller) continue;
            bytes memory data = _logs[i].data;
            for (uint256 j = 0; j + 32 <= data.length; j += 32) {
                bytes32 word;
                // solhint-disable-next-line no-inline-assembly
                assembly {
                    word := mload(add(add(data, 32), j))
                }
                if (word == messageId) return (messageId, _logs[i].emitter);
            }
            for (uint256 t = 0; t < _logs[i].topics.length; t++) {
                if (_logs[i].topics[t] == messageId) return (messageId, _logs[i].emitter);
            }
        }
    }
}
