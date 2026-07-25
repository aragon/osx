// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

import {DAO} from "../../../src/core/dao/DAO.sol";
import {Action} from "../../../src/common/executors/IExecutor.sol";
import {
    CrossChainController
} from "../../../src/common/crosschain/CrossChainController.sol";
import {
    ICrossChainController,
    ICrossChainControllerEvents
} from "../../../src/common/crosschain/ICrossChainController.sol";
import {
    CCIPAdapter
} from "../../../src/common/crosschain/adapters/CCIP/CCIPAdapter.sol";
import {
    BaseAdapter
} from "../../../src/common/crosschain/adapters/BaseAdapter.sol";
import {
    TransactionLib,
    Transaction,
    TransactionState
} from "../../../src/common/crosschain/lib/Transaction.sol";
import {ChainIds} from "../../../src/common/crosschain/lib/ChainIds.sol";

import {
    CCIPRelayRouterMock
} from "../../mocks/commons/crosschain/CCIPRelayRouterMock.sol";
import {
    GuardedTarget
} from "../../mocks/commons/crosschain/E2ETargets.sol";
import {ERC20Mock} from "../../mocks/commons/token/ERC20Mock.sol";

/// @title CrossChainE2EBase
/// @notice Two (optionally three) complete cross-chain stacks -- a REAL OSx
///         `DAO` plus a `CrossChainController` and a `CCIPAdapter` -- standing
///         up in a single Foundry process, wired to each other through paired
///         `CCIPRelayRouterMock`s.
///
/// @dev WHY A REAL DAO. The unit suites under `test/common/crosschain/unit/`
///      run against `CrossChainControllerDAOMock`, whose `hasPermission` is a
///      settable mapping. That proves the controller CALLS the right permission
///      checks, but never that a real `PermissionManager` grant makes them pass
///      or that a revoke makes them fail, and never that a real `DAO.execute`
///      runs the delivered actions. Everything here goes through
///      `DAO.grant` / `DAO.revoke` / `DAO.execute`.
///
///      WHY `vm.chainId`. Both stacks live in one EVM at different addresses,
///      and `block.chainid` is flipped between the send phase and the delivery
///      phase. `block.chainid` is the only per-chain value the contracts read
///      -- it stamps `Transaction.originChainId` / `destinationChainId` on the
///      way out and backs the `INCORRECT_CHAIN_MISMATCH` guard on the way in --
///      so flipping it makes those checks real rather than cosmetic. Tests use
///      `_on(chain)`; none of them touch `vm.chainId` directly.
///
///      REAL CHAIN IDS AND SELECTORS. The stacks use the production values from
///      `ChainIds.sol`, so the adapter's hardcoded `toNativeChainId` /
///      `fromNativeChainId` tables are exercised with the same numbers
///      production will use.
abstract contract CrossChainE2EBase is Test, ICrossChainControllerEvents {
    using TransactionLib for Transaction;

    // -------------------------------------------------------------------------
    // Permission ids
    // -------------------------------------------------------------------------

    bytes32 internal constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION");
    bytes32 internal constant EXECUTE_PERMISSION_ID =
        keccak256("EXECUTE_PERMISSION");
    bytes32 internal constant FORWARD_MESSAGE_PERMISSION_ID =
        keccak256("FORWARD_MESSAGE_PERMISSION");
    bytes32 internal constant UPDATE_CONFIG_PERMISSION_ID =
        keccak256("UPDATE_CONFIG_PERMISSION");
    bytes32 internal constant RETRY_MESSAGE_PERMISSION_ID =
        keccak256("RETRY_MESSAGE_PERMISSION");
    bytes32 internal constant SWEEP_PERMISSION_ID = keccak256("SWEEP_PERMISSION");

    // -------------------------------------------------------------------------
    // Chains
    // -------------------------------------------------------------------------

    uint256 internal constant ORIGIN_CHAIN_ID = ChainIds.ETHEREUM;
    uint256 internal constant DESTINATION_CHAIN_ID = ChainIds.BASE;
    uint256 internal constant THIRD_CHAIN_ID = ChainIds.ARBITRUM_ONE;

    uint64 internal constant ORIGIN_SELECTOR = 5009297550715157269;
    uint64 internal constant DESTINATION_SELECTOR = 15971525489660198786;
    uint64 internal constant THIRD_SELECTOR = 4949039107694359620;

    uint256 internal constant GAS_LIMIT = 400_000;
    uint256 internal constant FEE = 0.01 ether;

    bytes internal constant DAO_METADATA = hex"0001";
    string internal constant DAO_URI = "https://example.org";

    /// @notice One chain's worth of contracts.
    /// @param chainId The standard chain id this stack pretends to live on.
    /// @param selector The CCIP chain selector of that chain.
    /// @param dao The OSx DAO.
    /// @param controller The DAO's cross-chain hub.
    /// @param adapter The CCIP adapter owned by that controller.
    /// @param router The paired router mock standing in for CCIP on that chain.
    /// @param target The contract cross-chain actions operate on.
    struct Stack {
        uint256 chainId;
        uint64 selector;
        DAO dao;
        CrossChainController controller;
        CCIPAdapter adapter;
        CCIPRelayRouterMock router;
        GuardedTarget target;
    }

    Stack internal origin;
    Stack internal destination;

    /// @notice The governance plugin that executes proposals on each DAO.
    address internal plugin = makeAddr("governancePlugin");

    /// @notice An account holding no permission anywhere.
    address internal stranger = makeAddr("stranger");

    /// @notice The ERC20 fee token used by the fee tests. Deployed once and
    ///         shared, since it is only ever read by balance/allowance checks.
    ERC20Mock internal feeToken;

    // -------------------------------------------------------------------------
    // Setup
    // -------------------------------------------------------------------------

    function setUp() public virtual {
        feeToken = new ERC20Mock("Fee", "FEE");

        (origin, destination) = _deployLane(
            ORIGIN_CHAIN_ID,
            ORIGIN_SELECTOR,
            DESTINATION_CHAIN_ID,
            DESTINATION_SELECTOR,
            address(0)
        );

        // The origin controller is the fee payer; pre-fund it the way ops would.
        vm.deal(address(origin.controller), 100 ether);
        vm.deal(address(destination.controller), 100 ether);

        // Tests start life on the origin chain.
        _on(origin);
    }

    /// @notice Deploys a THIRD stack, reachable from the origin.
    /// @dev One-directional on purpose: the origin can send to it, and it
    ///      trusts the origin controller, but the origin adapter does not trust
    ///      it back (trusted remotes are constructor-only). That is all the
    ///      multi-lane and cross-chain-replay scenarios need, and keeping it
    ///      one-directional makes the asymmetry explicit.
    function _deployThirdStack() internal returns (Stack memory c) {
        c.chainId = THIRD_CHAIN_ID;
        c.selector = THIRD_SELECTOR;

        c.router = new CCIPRelayRouterMock(THIRD_SELECTOR);
        c.router.setFee(FEE);
        origin.router.setPeer(THIRD_SELECTOR, c.router);
        c.router.setPeer(ORIGIN_SELECTOR, origin.router);

        c.dao = _deployDao("dao:C");
        c.controller = new CrossChainController(address(c.dao));
        c.adapter = new CCIPAdapter(
            address(c.controller),
            address(c.router),
            address(0),
            _trustedRemotes(ORIGIN_CHAIN_ID, address(origin.controller))
        );
        c.target = new GuardedTarget();

        _label(c, "C");
        _grantStackPermissions(c);

        _configureLane(c, ORIGIN_CHAIN_ID, address(origin.adapter));
        _configureLane(origin, THIRD_CHAIN_ID, address(c.adapter));

        vm.deal(address(c.controller), 100 ether);
    }

    /// @notice Deploys and fully wires two stacks that can talk to each other.
    /// @dev Deployment ORDER matters and mirrors what a real two-sided rollout
    ///      has to do: `CCIPAdapter` takes its trusted remotes in the
    ///      CONSTRUCTOR and exposes no setter, so both controllers must exist
    ///      before either adapter can be deployed.
    /// @param _aChainId The standard chain id of side A.
    /// @param _aSelector The CCIP selector of side A.
    /// @param _bChainId The standard chain id of side B.
    /// @param _bSelector The CCIP selector of side B.
    /// @param _feeToken The fee token for both sides; `address(0)` for native.
    function _deployLane(
        uint256 _aChainId,
        uint64 _aSelector,
        uint256 _bChainId,
        uint64 _bSelector,
        address _feeToken
    ) internal returns (Stack memory a, Stack memory b) {
        a.chainId = _aChainId;
        a.selector = _aSelector;
        b.chainId = _bChainId;
        b.selector = _bSelector;

        // Routers, peered in both directions.
        a.router = new CCIPRelayRouterMock(_aSelector);
        b.router = new CCIPRelayRouterMock(_bSelector);
        a.router.setPeer(_bSelector, b.router);
        b.router.setPeer(_aSelector, a.router);
        a.router.setFee(FEE);
        b.router.setFee(FEE);

        // DAOs and controllers first -- the adapters need both controller
        // addresses to bake in their trusted remotes.
        a.dao = _deployDao("dao:A");
        b.dao = _deployDao("dao:B");
        a.controller = new CrossChainController(address(a.dao));
        b.controller = new CrossChainController(address(b.dao));

        // Each adapter trusts the REMOTE CONTROLLER, never the remote adapter:
        // the send path is `delegatecall`ed, so the bridge attributes the
        // message to the controller.
        a.adapter = new CCIPAdapter(
            address(a.controller),
            address(a.router),
            _feeToken,
            _trustedRemotes(_bChainId, address(b.controller))
        );
        b.adapter = new CCIPAdapter(
            address(b.controller),
            address(b.router),
            _feeToken,
            _trustedRemotes(_aChainId, address(a.controller))
        );

        a.target = new GuardedTarget();
        b.target = new GuardedTarget();

        _label(a, "A");
        _label(b, "B");

        _grantStackPermissions(a);
        _grantStackPermissions(b);

        // The lane is keyed by the REMOTE chain id and serves both directions:
        // it is the send route out, and the authorization of the local adapter
        // for inbound messages from that chain.
        _configureLane(a, _bChainId, address(b.adapter));
        _configureLane(b, _aChainId, address(a.adapter));
    }

    /// @notice Deploys a real `DAO` behind an ERC-1967 proxy, with this test
    ///         contract as the initial ROOT holder.
    /// @dev Mirrors `test/core/dao/DAO.t.sol`. The test contract keeps ROOT so
    ///      it can grant and revoke at will; in production that is the DAO
    ///      itself after the setup handover.
    /// @param _daoLabel A `vm.label` for readable traces.
    function _deployDao(
        string memory _daoLabel
    ) internal returns (DAO dao_) {
        DAO impl = new DAO();
        dao_ = DAO(
            payable(
                address(
                    new ERC1967Proxy(
                        address(impl),
                        abi.encodeCall(
                            DAO.initialize,
                            (DAO_METADATA, address(this), address(0), DAO_URI)
                        )
                    )
                )
            )
        );

        vm.label(address(dao_), _daoLabel);
    }

    /// @notice Grants the full permission set a production stack needs.
    /// @dev `FORWARD_MESSAGE_PERMISSION` goes to the DAO itself, because a
    ///      cross-chain send is produced by a passed proposal: the DAO executes
    ///      an action that calls `forwardMessage`. See `_forwardViaProposal`.
    function _grantStackPermissions(Stack memory _chain) internal {
        DAO dao = _chain.dao;
        address controller = address(_chain.controller);

        // The governance plugin is what executes proposals on the DAO.
        dao.grant(address(dao), plugin, EXECUTE_PERMISSION_ID);

        // The controller executes inbound payloads on the DAO.
        dao.grant(address(dao), controller, EXECUTE_PERMISSION_ID);

        // Outbound and operational permissions, all held by the DAO.
        dao.grant(controller, address(dao), FORWARD_MESSAGE_PERMISSION_ID);
        dao.grant(controller, address(dao), UPDATE_CONFIG_PERMISSION_ID);
        dao.grant(controller, address(dao), RETRY_MESSAGE_PERMISSION_ID);
        dao.grant(controller, address(dao), SWEEP_PERMISSION_ID);
    }

    /// @notice Configures one lane on a controller, acting as the DAO.
    /// @dev Pranks the DAO rather than granting this test contract the
    ///      permission, so the call travels the same authorization path a
    ///      passed proposal would.
    /// @param _chain The local stack.
    /// @param _remoteChainId The standard chain id of the counterparty.
    /// @param _remoteAdapter The counterparty's ADAPTER (the CCIP receiver).
    function _configureLane(
        Stack memory _chain,
        uint256 _remoteChainId,
        address _remoteAdapter
    ) internal {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = _remoteChainId;

        ICrossChainController.ChainConfig[]
            memory configs = new ICrossChainController.ChainConfig[](1);
        configs[0] = ICrossChainController.ChainConfig({
            localAdapter: address(_chain.adapter),
            remoteAdapter: _remoteAdapter
        });

        vm.prank(address(_chain.dao));
        _chain.controller.updateConfig(chainIds, configs);
    }

    /// @notice Configures a lane whose LOCAL adapter is something other than
    ///         the stack's own -- a codeless address, a stale adapter, a
    ///         deliberately broken one.
    /// @param _stack The local stack.
    /// @param _remoteChainId The standard chain id of the counterparty.
    /// @param _localAdapter The address to register as the local adapter.
    /// @param _remoteAdapter The counterparty's adapter.
    function _configureLaneWithLocalAdapter(
        Stack memory _stack,
        uint256 _remoteChainId,
        address _localAdapter,
        address _remoteAdapter
    ) internal {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = _remoteChainId;

        ICrossChainController.ChainConfig[]
            memory configs = new ICrossChainController.ChainConfig[](1);
        configs[0] = ICrossChainController.ChainConfig({
            localAdapter: _localAdapter,
            remoteAdapter: _remoteAdapter
        });

        vm.prank(address(_stack.dao));
        _stack.controller.updateConfig(chainIds, configs);
    }

    /// @notice Clears a lane on a controller, acting as the DAO.
    function _clearLane(Stack memory _chain, uint256 _remoteChainId) internal {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = _remoteChainId;

        ICrossChainController.ChainConfig[]
            memory configs = new ICrossChainController.ChainConfig[](1);
        configs[0] = ICrossChainController.ChainConfig({
            localAdapter: address(0),
            remoteAdapter: address(0)
        });

        vm.prank(address(_chain.dao));
        _chain.controller.updateConfig(chainIds, configs);
    }

    // -------------------------------------------------------------------------
    // Chain switching
    // -------------------------------------------------------------------------

    /// @notice Makes `block.chainid` report `_chain`'s chain id.
    /// @dev Every test phase must be wrapped in one of these. Sending from the
    ///      origin stamps `originChainId = block.chainid`; delivering to the
    ///      destination checks `destinationChainId == block.chainid`.
    function _on(Stack memory _chain) internal {
        vm.chainId(_chain.chainId);
    }

    // -------------------------------------------------------------------------
    // Sending
    // -------------------------------------------------------------------------

    /// @notice Sends a message the way production does: a passed proposal is
    ///         executed on the origin DAO, and one of its actions calls
    ///         `forwardMessage` on the controller.
    /// @param _from The origin stack.
    /// @param _to The destination stack.
    /// @param _gasLimit The destination gas limit to request.
    /// @param _payload The encoded `Action[]` to run on the destination DAO.
    /// @return txId The controller's transaction id for the message.
    function _forwardViaProposal(
        Stack memory _from,
        Stack memory _to,
        uint256 _gasLimit,
        bytes memory _payload
    ) internal returns (bytes32 txId) {
        Action[] memory actions = new Action[](1);
        actions[0] = Action({
            to: address(_from.controller),
            value: 0,
            data: abi.encodeCall(
                ICrossChainController.forwardMessage,
                (_to.chainId, _gasLimit, _payload)
            )
        });

        vm.prank(plugin);
        (bytes[] memory results, ) = _from.dao.execute(
            keccak256("proposal"),
            actions,
            0
        );

        txId = abi.decode(results[0], (bytes32));
    }

    /// @notice Sends a message directly as the DAO, skipping the proposal.
    /// @dev Shorter than `_forwardViaProposal` for tests whose subject is the
    ///      destination side rather than the origin's governance path.
    function _forwardAsDao(
        Stack memory _from,
        Stack memory _to,
        uint256 _gasLimit,
        bytes memory _payload
    ) internal returns (bytes32 txId) {
        vm.prank(address(_from.dao));
        txId = _from.controller.forwardMessage(_to.chainId, _gasLimit, _payload);
    }

    // -------------------------------------------------------------------------
    // Delivering
    // -------------------------------------------------------------------------

    /// @notice Delivers the oldest undelivered message queued on `_from`'s
    ///         router, with `block.chainid` switched to `_to` for the duration.
    /// @return messageId The bridge-level id of the attempted message.
    /// @return success Whether `ccipReceive` succeeded at the BRIDGE level.
    ///         False means CCIP would mark the message failed and leave it
    ///         manually executable -- it does NOT mean the payload failed. A
    ///         payload failure is caught by the controller and reported as a
    ///         successful delivery in a `Delivered` state.
    function _deliverNext(
        Stack memory _from,
        Stack memory _to
    ) internal returns (bytes32 messageId, bool success) {
        uint256 previous = block.chainid;
        _on(_to);
        (messageId, success) = _from.router.deliverNext();
        vm.chainId(previous);
    }

    /// @notice Delivers a specific queued message.
    function _deliver(
        Stack memory _from,
        Stack memory _to,
        bytes32 _messageId
    ) internal returns (bool success) {
        uint256 previous = block.chainid;
        _on(_to);
        success = _from.router.deliver(_messageId);
        vm.chainId(previous);
    }

    /// @notice Replays a failed message with a different gas limit, which is
    ///         what CCIP manual execution does.
    function _manualExecute(
        Stack memory _from,
        Stack memory _to,
        bytes32 _messageId,
        uint256 _gasOverride
    ) internal returns (bool success) {
        uint256 previous = block.chainid;
        _on(_to);
        success = _from.router.manualExecute(_messageId, _gasOverride);
        vm.chainId(previous);
    }

    /// @notice Hands a hand-built message straight to a destination adapter
    ///         through its own router, bypassing any queue.
    /// @dev This is how a test forges a delivery: a doctored sender, an
    ///      unmapped source selector, a replayed or tampered payload. The
    ///      destination router is the caller, so the adapter's `onlyRouter`
    ///      check passes and the test is about what happens AFTER it.
    /// @param _to The destination stack.
    /// @param _messageId The bridge-level id to claim.
    /// @param _sourceSelector The CCIP selector to claim as the origin.
    /// @param _sender The address to claim as the origin-chain sender.
    /// @param _data The payload bytes.
    /// @param _gasLimit The exact gas to give the adapter.
    /// @return success Whether `ccipReceive` succeeded.
    /// @return returnData The revert data when it did not.
    function _forgeDelivery(
        Stack memory _to,
        bytes32 _messageId,
        uint64 _sourceSelector,
        address _sender,
        bytes memory _data,
        uint256 _gasLimit
    ) internal returns (bool success, bytes memory returnData) {
        return
            _forgeDeliveryRaw(
                _to,
                _messageId,
                _sourceSelector,
                abi.encode(_sender),
                _data,
                _gasLimit
            );
    }

    /// @notice `_forgeDelivery` with arbitrary sender BYTES, so a test can send
    ///         something that does not decode to an address at all.
    function _forgeDeliveryRaw(
        Stack memory _to,
        bytes32 _messageId,
        uint64 _sourceSelector,
        bytes memory _senderBytes,
        bytes memory _data,
        uint256 _gasLimit
    ) internal returns (bool success, bytes memory returnData) {
        uint256 previous = block.chainid;
        _on(_to);

        (success, returnData) = _to.router.executeDelivery(
            Client.Any2EVMMessage({
                messageId: _messageId,
                sourceChainSelector: _sourceSelector,
                sender: _senderBytes,
                data: _data,
                destTokenAmounts: new Client.EVMTokenAmount[](0)
            }),
            address(_to.adapter),
            _gasLimit
        );

        vm.chainId(previous);
    }

    // -------------------------------------------------------------------------
    // Payload helpers
    // -------------------------------------------------------------------------

    /// @notice The payload of a cross-chain proposal that calls the target.
    function _cancelPayload(
        Stack memory _to
    ) internal pure returns (bytes memory) {
        Action[] memory actions = new Action[](1);
        actions[0] = Action({
            to: address(_to.target),
            value: 0,
            data: abi.encodeCall(GuardedTarget.cancelRootUpdate, ())
        });

        return abi.encode(actions);
    }

    /// @notice A payload wrapping a single arbitrary action.
    function _actionPayload(
        address _to,
        uint256 _value,
        bytes memory _data
    ) internal pure returns (bytes memory) {
        Action[] memory actions = new Action[](1);
        actions[0] = Action({to: _to, value: _value, data: _data});

        return abi.encode(actions);
    }

    /// @notice A payload wrapping an empty action array.
    function _emptyPayload() internal pure returns (bytes memory) {
        return abi.encode(new Action[](0));
    }

    /// @notice Rebuilds the exact envelope bytes a send produced, so a test can
    ///         hand them to `retryMessage` or replay them by hand.
    /// @param _from The origin stack.
    /// @param _to The destination stack.
    /// @param _nonce The origin controller's nonce for the message.
    /// @param _origin The account that called `forwardMessage`.
    /// @param _message The encoded `Action[]`.
    function _encodedTx(
        Stack memory _from,
        Stack memory _to,
        uint256 _nonce,
        address _origin,
        bytes memory _message
    ) internal pure returns (bytes memory) {
        return
            Transaction({
                nonce: _nonce,
                origin: _origin,
                controller: address(_from.controller),
                originChainId: _from.chainId,
                destinationChainId: _to.chainId,
                message: _message
            }).encode();
    }

    /// @notice The payload bytes of the message queued at `_index` on a router.
    /// @dev The router stores exactly what the adapter handed CCIP, so this is
    ///      the authoritative envelope for retry and replay tests.
    function _queuedPayload(
        Stack memory _from,
        uint256 _index
    ) internal view returns (bytes memory) {
        return _from.router.sentAt(_index).data;
    }

    // -------------------------------------------------------------------------
    // Assertions
    // -------------------------------------------------------------------------

    /// @notice Asserts a transaction reached `Executed` on the destination.
    function _assertExecuted(
        Stack memory _to,
        bytes32 _txId
    ) internal view {
        assertEq(
            uint256(_to.controller.getTransactionState(_txId)),
            uint256(TransactionState.Executed),
            "transaction should be Executed"
        );
    }

    /// @notice Asserts a transaction was delivered but its payload failed, so
    ///         it is awaiting `retryMessage`.
    function _assertDelivered(
        Stack memory _to,
        bytes32 _txId
    ) internal view {
        assertEq(
            uint256(_to.controller.getTransactionState(_txId)),
            uint256(TransactionState.Delivered),
            "transaction should be Delivered (failed, retryable)"
        );
    }

    /// @notice Asserts the destination has no record of a transaction, which is
    ///         the state after a BRIDGE-level delivery failure.
    function _assertUnknown(
        Stack memory _to,
        bytes32 _txId
    ) internal view {
        assertEq(
            uint256(_to.controller.getTransactionState(_txId)),
            uint256(TransactionState.None),
            "transaction should be unknown to the destination"
        );
    }

    // -------------------------------------------------------------------------
    // Misc helpers
    // -------------------------------------------------------------------------

    /// @dev Builds the single-entry trusted-remote config an adapter takes.
    function _trustedRemotes(
        uint256 _chainId,
        address _remoteController
    ) internal pure returns (BaseAdapter.TrustedRemoteConfig[] memory configs) {
        configs = new BaseAdapter.TrustedRemoteConfig[](1);
        configs[0] = BaseAdapter.TrustedRemoteConfig({
            standardChainId: _chainId,
            trustedRemote: _remoteController
        });
    }

    /// @dev Labels every contract of a stack for readable traces.
    function _label(Stack memory _chain, string memory _side) internal {
        vm.label(address(_chain.controller), _concat("controller:", _side));
        vm.label(address(_chain.adapter), _concat("adapter:", _side));
        vm.label(address(_chain.router), _concat("router:", _side));
        vm.label(address(_chain.target), _concat("target:", _side));
    }

    function _concat(
        string memory _a,
        string memory _b
    ) internal pure returns (string memory) {
        return string(abi.encodePacked(_a, _b));
    }
}
