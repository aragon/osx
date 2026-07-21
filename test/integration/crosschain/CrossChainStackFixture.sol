// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {DAO} from "../../../src/core/dao/DAO.sol";
import {IDAO} from "../../../src/common/dao/IDAO.sol";
import {CrossChainController} from "../../../src/common/crosschain/CrossChainController.sol";
import {CCIPAdapter} from "../../../src/common/crosschain/adapters/CCIP/CCIPAdapter.sol";

/// @notice Shared scaffolding that stands up a REAL OSx `DAO` (behind an
///         ERC-1967 proxy, with a real `PermissionManager`) plus a
///         `CrossChainController` + `CCIPAdapter` pair, and wires the exact
///         permission set the design requires.
/// @dev Used by the in-process round-trip test and by the fork tests, so both
///      exercise the same wiring the deployment scripts are meant to produce.
///
///      WHY A REAL DAO. The pre-existing unit suites run against
///      `CrossChainControllerDAOMock`, whose `hasPermission` is a settable
///      mapping. That proves the controller CALLS the right permission checks,
///      but never that a real `PermissionManager` GRANT makes them pass or that
///      a revoke makes them fail. Everything here goes through
///      `DAO.grant`/`DAO.revoke` and `DAO.execute` for that reason.
abstract contract CrossChainStackFixture is Test {
    bytes32 internal constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION");
    bytes32 internal constant EXECUTE_PERMISSION_ID = keccak256("EXECUTE_PERMISSION");
    bytes32 internal constant FORWARD_MESSAGE_PERMISSION_ID = keccak256("FORWARD_MESSAGE_PERMISSION");
    bytes32 internal constant UPDATE_CONFIG_PERMISSION_ID = keccak256("UPDATE_CONFIG_PERMISSION");
    bytes32 internal constant RETRY_MESSAGE_PERMISSION_ID = keccak256("RETRY_MESSAGE_PERMISSION");
    bytes32 internal constant SWEEP_PERMISSION_ID = keccak256("SWEEP_PERMISSION");
    bytes32 internal constant UPDATE_ADAPTER_CONFIG_PERMISSION_ID = keccak256("UPDATE_ADAPTER_CONFIG_PERMISSION");

    bytes internal constant DAO_METADATA = hex"0001";
    string internal constant DAO_URI = "https://example.org";

    /// @notice One chain's worth of contracts.
    /// @param dao The OSx DAO on that chain.
    /// @param controller The DAO's cross-chain hub.
    /// @param adapter The CCIP adapter owned by that controller.
    struct Stack {
        DAO dao;
        CrossChainController controller;
        CCIPAdapter adapter;
    }

    // -------------------------------------------------------------------------
    // Deployment
    // -------------------------------------------------------------------------

    /// @notice Deploys a real `DAO` behind an ERC-1967 proxy, with the calling
    ///         test contract as the initial `ROOT_PERMISSION` holder.
    /// @dev Mirrors `test/core/dao/DAO.t.sol`'s setup. The test contract keeps
    ///      ROOT so it can grant/revoke at will; in production that is the DAO
    ///      itself after the setup handover.
    /// @param _label A `vm.label` for readable traces.
    function _deployDao(string memory _label) internal returns (DAO dao_) {
        DAO impl = new DAO();
        dao_ = DAO(
            payable(
                address(
                    new ERC1967Proxy(
                        address(impl),
                        abi.encodeCall(DAO.initialize, (DAO_METADATA, address(this), address(0), DAO_URI))
                    )
                )
            )
        );
        vm.label(address(dao_), _label);
    }

    /// @notice Deploys a `CrossChainController` + `CCIPAdapter` for one chain.
    /// @dev Order matters: `CCIPAdapter`'s constructor reads
    ///      `CrossChainController.dao()`, so the controller must exist first.
    /// @param _dao The DAO that owns (and permissions) the stack.
    /// @param _ccipRouter The CCIP router on that chain.
    /// @param _feeToken The fee token; `address(0)` for native.
    /// @param _remoteChainIds The standard chain ids of the remote lanes.
    /// @param _remoteControllers The remote CONTROLLER per lane. NOT the
    ///        remote adapter — see `BaseAdapter`'s contract docs.
    /// @param _selectorChainIds The standard chain ids of the selector map.
    /// @param _chainSelectors The CCIP selector per `_selectorChainIds` entry.
    function _deployStack(
        DAO _dao,
        address _ccipRouter,
        address _feeToken,
        uint256[] memory _remoteChainIds,
        address[] memory _remoteControllers,
        uint256[] memory _selectorChainIds,
        uint64[] memory _chainSelectors
    ) internal returns (Stack memory stack) {
        stack.dao = _dao;
        stack.controller = new CrossChainController(address(_dao));
        stack.adapter = new CCIPAdapter(
            address(stack.controller),
            _ccipRouter,
            _feeToken,
            _remoteChainIds,
            _remoteControllers,
            _selectorChainIds,
            _chainSelectors
        );
    }

    // -------------------------------------------------------------------------
    // Permissions
    // -------------------------------------------------------------------------

    /// @notice Grants the full permission set a production stack needs.
    /// @dev Deliberately grants the config permissions to the DAO ITSELF and to
    ///      nothing else — `UPDATE_CONFIG_PERMISSION` is effectively root on the
    ///      DAO (see the security note on `CrossChainController`).
    /// @param _stack The stack to permission.
    /// @param _forwarder The account allowed to call `forwardMessage`; in
    ///        production the DAO (whose proposals produce the send), which is
    ///        what the round-trip test uses.
    function _grantStackPermissions(Stack memory _stack, address _forwarder) internal {
        DAO dao = _stack.dao;

        // The controller executes inbound payloads on the DAO.
        dao.grant(address(dao), address(_stack.controller), EXECUTE_PERMISSION_ID);

        // Outbound + operational permissions on the controller.
        dao.grant(address(_stack.controller), _forwarder, FORWARD_MESSAGE_PERMISSION_ID);
        dao.grant(address(_stack.controller), address(dao), UPDATE_CONFIG_PERMISSION_ID);
        dao.grant(address(_stack.controller), address(dao), RETRY_MESSAGE_PERMISSION_ID);
        dao.grant(address(_stack.controller), address(dao), SWEEP_PERMISSION_ID);

        // Receive-side adapter configuration.
        dao.grant(address(_stack.adapter), address(dao), UPDATE_ADAPTER_CONFIG_PERMISSION_ID);
    }

    // -------------------------------------------------------------------------
    // Lane configuration
    // -------------------------------------------------------------------------

    /// @notice Configures one outbound lane on the controller, acting as the DAO.
    /// @dev Pranks the DAO rather than granting the test contract the
    ///      permission, so the call travels the same authorization path a
    ///      passed proposal would.
    /// @param _stack The local stack.
    /// @param _remoteChainId The standard chain id of the destination.
    /// @param _remoteAdapter The destination chain's ADAPTER (the CCIP receiver).
    /// @param _remoteSelector The destination chain's CCIP selector.
    function _configureLane(
        Stack memory _stack,
        uint256 _remoteChainId,
        address _remoteAdapter,
        uint64 _remoteSelector
    ) internal {
        uint256[] memory chainIds = _uint256s(_remoteChainId);
        CrossChainController.ChainConfig[] memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = CrossChainController.ChainConfig({
            localAdapter: address(_stack.adapter),
            remoteAdapter: _remoteAdapter,
            bridgeChainId: _remoteSelector
        });

        vm.prank(address(_stack.dao));
        _stack.controller.updateConfig(chainIds, configs);
    }

    /// @notice Sets one receive-side trusted remote on the adapter, as the DAO.
    /// @dev This is the phase-2 half of a two-sided deployment: the remote
    ///      CONTROLLER address is not knowable when the local adapter is
    ///      constructed, so it is set afterwards through the permissioned
    ///      setter — the same call the deployment scripts print for the DAO.
    /// @param _stack The local stack.
    /// @param _remoteChainId The standard chain id of the origin.
    /// @param _remoteController The origin chain's CONTROLLER. NOT its adapter.
    function _setTrustedRemote(Stack memory _stack, uint256 _remoteChainId, address _remoteController) internal {
        vm.prank(address(_stack.dao));
        _stack.adapter.setTrustedRemotes(_uint256s(_remoteChainId), _addresses(_remoteController));
    }

    // -------------------------------------------------------------------------
    // Array helpers
    // -------------------------------------------------------------------------

    function _uint256s(uint256 _a) internal pure returns (uint256[] memory out) {
        out = new uint256[](1);
        out[0] = _a;
    }

    function _uint256s(uint256 _a, uint256 _b) internal pure returns (uint256[] memory out) {
        out = new uint256[](2);
        out[0] = _a;
        out[1] = _b;
    }

    function _addresses(address _a) internal pure returns (address[] memory out) {
        out = new address[](1);
        out[0] = _a;
    }

    function _uint64s(uint64 _a) internal pure returns (uint64[] memory out) {
        out = new uint64[](1);
        out[0] = _a;
    }

    function _uint64s(uint64 _a, uint64 _b) internal pure returns (uint64[] memory out) {
        out = new uint64[](2);
        out[0] = _a;
        out[1] = _b;
    }
}
