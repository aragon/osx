// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    IRouterClient
} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {
    IAny2EVMMessageReceiver
} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";

import {CrossChainE2EBase} from "../CrossChainE2EBase.sol";
import {
    CrossChainController
} from "../../../../src/common/crosschain/CrossChainController.sol";
import {
    CCIPAdapter
} from "../../../../src/common/crosschain/adapters/CCIP/CCIPAdapter.sol";
import {
    TransactionLib
} from "../../../../src/common/crosschain/lib/Transaction.sol";
import {ChainIds} from "../../../../src/common/crosschain/lib/ChainIds.sol";
import {Errors} from "../../../../src/common/crosschain/lib/Errors.sol";
import {
    GuardedTarget
} from "../../../mocks/commons/crosschain/E2ETargets.sol";

/// @notice The parts of the production CCIP `Router` this suite drives that are
///         not on `IRouterClient`.
interface IRouterFork {
    struct OffRamp {
        uint64 sourceChainSelector;
        address offRamp;
    }

    /// @notice Every OffRamp registered on this Router.
    function getOffRamps() external view returns (OffRamp[] memory);

    /// @notice Delivers a message to a receiver with EXACT gas. `onlyOffRamp`.
    function routeMessage(
        Client.Any2EVMMessage calldata message,
        uint16 gasForCallExactCheck,
        uint256 gasLimit,
        address receiver
    ) external returns (bool success, bytes memory retData, uint256 gasUsed);

    function typeAndVersion() external view returns (string memory);
}

/// @title CCIPRealRouterForkTest
/// @notice The cross-chain stack running against the REAL, production
///         Chainlink CCIP Router bytecode on two real chains.
///
/// @dev WHAT THIS PROVES, and just as importantly what it does not.
///
///      PROVEN:
///      - our `Client.EVM2AnyMessage` is well-formed enough for the real
///        mainnet Router to price it, i.e. our `GenericExtraArgsV2` extraArgs
///        are accepted by the production OnRamp rather than silently defaulting
///        or reverting;
///      - a real `ccipSend` is ACCEPTED: the request is admitted and a message
///        id returned. That validates our calldata encoding, the native fee
///        paid out of the CONTROLLER's balance (the `delegatecall`
///        consequence), and the LINK `forceApprove` path, against real Router
///        bytecode rather than a mock we wrote ourselves;
///      - on the real destination chain, a real registered OffRamp calling the
///        real Router's `routeMessage` delivers to our adapter with real
///        exact-gas semantics, the trusted-remote check resolves the origin
///        CONTROLLER, and the destination DAO executes the actions;
///      - the Router addresses and the WHOLE chain-selector table we hardcode
///        in `CCIPAdapter` are still current.
///
///      NOT PROVEN, and no fork test can prove it:
///      - the DON transport itself. Nothing here waits for or exercises
///        committing, blessing or execution by the oracle network;
///      - that a lane is un-cursed and within its rate limits at the moment you
///        deploy. `getFee` succeeding implies the lane exists at the forked
///        block and says nothing about future config;
///      - real delivery latency or the smart-execution window.
///
///      DELIVERY MECHANISM. `Router.routeMessage` is `onlyOffRamp` and applies
///      `CallWithExactGas`, so pranking a REAL registered OffRamp into it is
///      the highest-fidelity delivery available without the DON: real Router,
///      real caller-authorisation path, real gas semantics. It is strictly
///      better than pranking the Router into `adapter.ccipReceive` directly,
///      which skips the Router's own logic entirely.
///
///      Excluded from CI, and skips unless both RPC endpoints are set. See
///      `src/common/crosschain/README.md` for how to run it.
contract CCIPRealRouterForkTest is CrossChainE2EBase {
    // Verified on-chain via `typeAndVersion() == "Router 1.2.0"`; the
    // `test_fork_routerAddressesAreCurrent` test re-checks this every run.
    address internal constant MAINNET_ROUTER =
        0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D;
    address internal constant BASE_ROUTER =
        0x881e3A65B4d4a04dD529061dd0071cf975F58bCD;
    address internal constant MAINNET_LINK =
        0x514910771AF9Ca656af840dff83E8264EcF986CA;

    /// @dev Mirrors the real Router's own constant.
    uint16 internal constant GAS_FOR_CALL_EXACT_CHECK = 5_000;

    uint256 internal ethFork;
    uint256 internal baseFork;

    /// @dev False when the RPC endpoints are missing, in which case every test
    ///      skips instead of failing.
    bool internal forksReady;

    /// @dev Skips the test cleanly when the endpoints are not configured.
    modifier withForks() {
        if (!forksReady) {
            vm.skip(true);
            return;
        }
        _;
    }

    /// @dev Replaces the mock-lane fixture entirely: the stacks here live on
    ///      two real forks. `Stack.router` is deliberately left unset -- it
    ///      types the mock transport, which has no place in this suite -- so
    ///      none of the base's `_deliver*` helpers may be used. Delivery goes
    ///      through `_deliverToBase` below.
    function setUp() public virtual override {
        string memory ethRpc = vm.envOr("MAINNET_RPC_URL", string(""));
        if (bytes(ethRpc).length == 0) {
            ethRpc = vm.envOr("RPC_URL", string(""));
        }
        string memory baseRpc = vm.envOr("BASE_RPC_URL", string(""));

        if (bytes(ethRpc).length == 0 || bytes(baseRpc).length == 0) return;

        ethFork = vm.createFork(ethRpc);
        baseFork = vm.createFork(baseRpc);
        forksReady = true;

        origin.chainId = ChainIds.ETHEREUM;
        origin.selector = ORIGIN_SELECTOR;
        destination.chainId = ChainIds.BASE;
        destination.selector = DESTINATION_SELECTOR;

        // Controllers on BOTH chains first: each adapter bakes the remote
        // controller in at construction and offers no setter afterwards.
        vm.selectFork(ethFork);
        origin.dao = _deployDao("dao:ETH");
        origin.controller = new CrossChainController(address(origin.dao));
        origin.target = new GuardedTarget();

        vm.selectFork(baseFork);
        destination.dao = _deployDao("dao:BASE");
        destination.controller = new CrossChainController(
            address(destination.dao)
        );
        destination.target = new GuardedTarget();

        // Adapters, then wiring, on each side.
        vm.selectFork(ethFork);
        origin.adapter = new CCIPAdapter(
            address(origin.controller),
            MAINNET_ROUTER,
            address(0),
            _trustedRemotes(
                destination.chainId,
                address(destination.controller)
            )
        );

        vm.selectFork(baseFork);
        destination.adapter = new CCIPAdapter(
            address(destination.controller),
            BASE_ROUTER,
            address(0),
            _trustedRemotes(origin.chainId, address(origin.controller))
        );
        _grantStackPermissions(destination);
        _configureLane(destination, origin.chainId, address(origin.adapter));

        vm.selectFork(ethFork);
        _grantStackPermissions(origin);
        _configureLane(
            origin,
            destination.chainId,
            address(destination.adapter)
        );
        vm.deal(address(origin.controller), 100 ether);
    }

    // -------------------------------------------------------------------------
    // Origin half: the real mainnet Router
    // -------------------------------------------------------------------------

    /// @notice The real Router prices our message, and the quote is sane.
    /// @dev A malformed `extraArgs` tag would revert here rather than return a
    ///      number, so this doubles as an encoding check.
    function test_fork_realRouterQuotesASaneFee() public withForks {
        vm.selectFork(ethFork);

        (address feeToken, uint256 fee, ) = origin.controller.quoteFee(
            destination.chainId,
            GAS_LIMIT,
            _cancelPayload(destination)
        );

        assertEq(feeToken, address(0), "native lane");
        assertGt(fee, 0, "a real lane must cost something");
        assertLt(fee, 1 ether, "and not an absurd amount");
    }

    /// @notice The quote rises with the requested gas limit, which proves the
    ///         limit inside `extraArgs` actually reaches the OnRamp.
    /// @dev If the tag or field order were wrong, CCIP would fall back to its
    ///      default and both quotes would be identical.
    function test_fork_quoteIsMonotonicInTheGasLimit() public withForks {
        vm.selectFork(ethFork);

        bytes memory payload = _cancelPayload(destination);

        (, uint256 cheap, ) = origin.controller.quoteFee(
            destination.chainId,
            100_000,
            payload
        );
        (, uint256 dear, ) = origin.controller.quoteFee(
            destination.chainId,
            2_000_000,
            payload
        );

        assertGt(dear, cheap, "extraArgs gas limit must reach the OnRamp");
    }

    /// @notice A real `ccipSend`, paid in native currency, is accepted by the
    ///         real Router, and the fee leaves the CONTROLLER's balance.
    function test_fork_realRouterAcceptsNativeFeeSend() public withForks {
        vm.selectFork(ethFork);

        (, uint256 fee, ) = origin.controller.quoteFee(
            destination.chainId,
            GAS_LIMIT,
            _cancelPayload(destination)
        );

        uint256 controllerBefore = address(origin.controller).balance;
        uint256 daoBefore = address(origin.dao).balance;

        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _cancelPayload(destination)
        );

        assertTrue(txId != bytes32(0));
        assertEq(
            address(origin.controller).balance,
            controllerBefore - fee,
            "the controller pays the real fee"
        );
        assertEq(address(origin.dao).balance, daoBefore, "treasury untouched");
        assertEq(address(origin.adapter).balance, 0, "adapter holds nothing");
    }

    /// @notice The ERC20 (LINK) fee path -- the `forceApprove` half -- against
    ///         real Router bytecode.
    function test_fork_realRouterAcceptsLinkFeeSend() public withForks {
        vm.selectFork(ethFork);

        // A LINK-fee stack, wired like the native one.
        CrossChainController linkController = new CrossChainController(
            address(origin.dao)
        );
        CCIPAdapter linkAdapter = new CCIPAdapter(
            address(linkController),
            MAINNET_ROUTER,
            MAINNET_LINK,
            _trustedRemotes(
                destination.chainId,
                address(destination.controller)
            )
        );

        origin.dao.grant(
            address(linkController),
            address(origin.dao),
            FORWARD_MESSAGE_PERMISSION_ID
        );
        origin.dao.grant(
            address(linkController),
            address(origin.dao),
            UPDATE_CONFIG_PERMISSION_ID
        );

        Stack memory linkStack = origin;
        linkStack.controller = linkController;
        linkStack.adapter = linkAdapter;
        _configureLane(
            linkStack,
            destination.chainId,
            address(destination.adapter)
        );

        (, uint256 fee, ) = linkController.quoteFee(
            destination.chainId,
            GAS_LIMIT,
            _cancelPayload(destination)
        );
        assertGt(fee, 0);

        deal(MAINNET_LINK, address(linkController), fee * 2);

        vm.prank(address(origin.dao));
        linkController.forwardMessage(
            destination.chainId,
            GAS_LIMIT,
            _cancelPayload(destination)
        );

        assertEq(
            IERC20(MAINNET_LINK).balanceOf(address(linkController)),
            fee,
            "exactly the quoted LINK should have been pulled"
        );
        assertEq(
            IERC20(MAINNET_LINK).allowance(
                address(linkController),
                MAINNET_ROUTER
            ),
            0,
            "no standing allowance may be left behind"
        );
    }

    // -------------------------------------------------------------------------
    // The full loop across two real chains
    // -------------------------------------------------------------------------

    /// @notice Send through the real mainnet Router, deliver through the real
    ///         Base Router, execute on the real destination DAO.
    function test_fork_roundTripAcrossRealRouters() public withForks {
        vm.selectFork(ethFork);
        bytes memory payload = _cancelPayload(destination);
        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            payload
        );

        bytes memory encodedTx = _encodedTx(
            origin,
            destination,
            1,
            address(origin.dao),
            payload
        );
        assertEq(TransactionLib.id(encodedTx), txId, "envelope must match");

        (bool success, ) = _deliverToBase(
            keccak256("real-round-trip"),
            address(origin.controller),
            encodedTx,
            GAS_LIMIT
        );

        assertTrue(success, "the real Router should have delivered");
        _assertExecuted(destination, txId);
        assertEq(destination.target.cancellations(), 1);
        assertEq(destination.target.lastCaller(), address(destination.dao));
    }

    /// @notice Under-gassed delivery through the REAL Router returns
    ///         `success == false` rather than reverting, stores nothing, and
    ///         is re-executable with more gas.
    /// @dev This is CCIP manual execution, on production bytecode. It confirms
    ///      the third gas regime from `GasLimits.t.sol` is real and not an
    ///      artefact of the mock transport.
    function test_fork_underGassedDeliveryIsRecoverable() public withForks {
        vm.selectFork(ethFork);
        bytes memory payload = _cancelPayload(destination);
        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            payload
        );
        bytes memory encodedTx = _encodedTx(
            origin,
            destination,
            1,
            address(origin.dao),
            payload
        );

        (bool starved, ) = _deliverToBase(
            keccak256("starved"),
            address(origin.controller),
            encodedTx,
            30_000
        );

        assertFalse(starved, "delivery must fail at the bridge level");
        _assertUnknown(destination, txId);

        (bool retried, ) = _deliverToBase(
            keccak256("starved"),
            address(origin.controller),
            encodedTx,
            GAS_LIMIT
        );

        assertTrue(retried, "manual re-execution should succeed");
        _assertExecuted(destination, txId);
    }

    /// @notice On the real destination chain, a delivery attributed to anyone
    ///         other than the origin CONTROLLER is rejected.
    function test_fork_untrustedSenderIsRejectedOnTheRealChain()
        public
        withForks
    {
        vm.selectFork(ethFork);
        bytes memory encodedTx = _encodedTx(
            origin,
            destination,
            1,
            address(origin.dao),
            _cancelPayload(destination)
        );

        (bool success, bytes memory reason) = _deliverToBase(
            keccak256("forged"),
            address(origin.adapter),
            encodedTx,
            GAS_LIMIT
        );

        assertFalse(success, "the remote ADAPTER is not the trusted remote");
        assertEq(reason, abi.encodeWithSelector(
            Errors.REMOTE_NOT_TRUSTED.selector
        ));
        assertEq(destination.target.cancellations(), 0);
    }

    /// @notice Only the real Router may reach the adapter.
    function test_fork_onlyTheRealRouterMayDeliver() public withForks {
        vm.selectFork(baseFork);

        vm.prank(stranger);
        vm.expectRevert(Errors.CALLER_NOT_CCIP_ROUTER.selector);
        destination.adapter.ccipReceive(
            _any2Evm(
                keccak256("forged"),
                ORIGIN_SELECTOR,
                abi.encode(address(origin.controller)),
                _cancelPayload(destination)
            )
        );
    }

    // -------------------------------------------------------------------------
    // Staleness guards
    // -------------------------------------------------------------------------

    /// @notice The Router addresses we hardcode still hold a CCIP Router.
    function test_fork_routerAddressesAreCurrent() public withForks {
        vm.selectFork(ethFork);
        assertEq(
            IRouterFork(MAINNET_ROUTER).typeAndVersion(),
            "Router 1.2.0",
            "mainnet router address is stale"
        );

        vm.selectFork(baseFork);
        assertEq(
            IRouterFork(BASE_ROUTER).typeAndVersion(),
            "Router 1.2.0",
            "base router address is stale"
        );
    }

    /// @notice EVERY chain in the adapter's hardcoded selector table is a live
    ///         CCIP lane from mainnet.
    /// @dev The table is compiled in and cannot be fixed without a redeploy, so
    ///      a wrong entry is only discoverable here. A failure means either a
    ///      typo in `toNativeChainId` or a lane that Chainlink has retired.
    function test_fork_everyMappedSelectorIsALiveLane() public withForks {
        vm.selectFork(ethFork);

        uint256[] memory chainIds = new uint256[](9);
        chainIds[0] = ChainIds.AVALANCHE;
        chainIds[1] = ChainIds.POLYGON;
        chainIds[2] = ChainIds.BNB;
        chainIds[3] = ChainIds.CELO;
        chainIds[4] = ChainIds.SONIC;
        chainIds[5] = ChainIds.PLASMA;
        chainIds[6] = ChainIds.MONAD;
        chainIds[7] = ChainIds.BASE;
        chainIds[8] = ChainIds.ARBITRUM_ONE;

        for (uint256 i = 0; i < chainIds.length; i++) {
            uint64 selector = uint64(
                origin.adapter.toNativeChainId(chainIds[i])
            );

            assertTrue(
                IRouterClient(MAINNET_ROUTER).isChainSupported(selector),
                string(
                    abi.encodePacked(
                        "no live mainnet lane for chain ",
                        vm.toString(chainIds[i])
                    )
                )
            );
        }
    }

    /// @notice The adapter is recognised as a CCIP receiver by the real
    ///         Router's ERC165 probe.
    /// @dev A false here would make the production Router SKIP delivery and
    ///      report success, losing every inbound message silently.
    function test_fork_adapterIsRecognisedAsACcipReceiver() public withForks {
        vm.selectFork(baseFork);

        assertTrue(
            destination.adapter.supportsInterface(
                type(IAny2EVMMessageReceiver).interfaceId
            )
        );
    }

    // -------------------------------------------------------------------------
    // Delivery through the real Base Router
    // -------------------------------------------------------------------------

    /// @notice Delivers a message to the destination adapter by pranking a REAL
    ///         registered OffRamp into the REAL Router's `routeMessage`.
    /// @dev Tries every OffRamp registered for the mainnet source selector:
    ///      Routers carry historical ramps, and only the current one is
    ///      necessarily usable. Reverting attempts are skipped, and a genuine
    ///      application-level rejection (which RETURNS false rather than
    ///      reverting) is reported back to the caller.
    /// @param _messageId The bridge-level id to claim.
    /// @param _sender The origin-chain address to attribute the message to.
    /// @param _data The envelope bytes.
    /// @param _gasLimit The exact gas to give the adapter.
    /// @return success Whether `ccipReceive` succeeded.
    /// @return returnData Its revert data when it did not.
    function _deliverToBase(
        bytes32 _messageId,
        address _sender,
        bytes memory _data,
        uint256 _gasLimit
    ) internal returns (bool success, bytes memory returnData) {
        vm.selectFork(baseFork);

        Client.Any2EVMMessage memory message = _any2Evm(
            _messageId,
            ORIGIN_SELECTOR,
            abi.encode(_sender),
            _data
        );

        IRouterFork.OffRamp[] memory offRamps = IRouterFork(BASE_ROUTER)
            .getOffRamps();

        for (uint256 i = offRamps.length; i > 0; i--) {
            IRouterFork.OffRamp memory ramp = offRamps[i - 1];
            if (ramp.sourceChainSelector != ORIGIN_SELECTOR) continue;

            vm.prank(ramp.offRamp);
            try
                IRouterFork(BASE_ROUTER).routeMessage(
                    message,
                    GAS_FOR_CALL_EXACT_CHECK,
                    _gasLimit,
                    address(destination.adapter)
                )
            returns (bool ok, bytes memory data, uint256) {
                return (ok, data);
            } catch {
                // A retired ramp; try the next one.
                continue;
            }
        }

        revert("no usable Base OffRamp for the mainnet lane");
    }
}
