// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {PluginRepoRegistry as PluginRepoRegistryV1_0_0} from "@aragon/osx-v1.0.0/framework/plugin/repo/PluginRepoRegistry.sol";
import {PluginRepoRegistry as PluginRepoRegistryV1_3_0} from "@aragon/osx-v1.3.0/framework/plugin/repo/PluginRepoRegistry.sol";
import {PluginRepoRegistry} from "../src/framework/plugin/repo/PluginRepoRegistry.sol";
import {ENSSubdomainRegistrar} from "../src/framework/utils/ens/ENSSubdomainRegistrar.sol";
import {IDAO} from "../src/common/dao/IDAO.sol";
import {DAOMock} from "../test/mocks/commons/dao/DAOMock.sol";

/// @dev ERC-165 stand-in claiming exactly the interface id the registry probes,
/// so `entries[...]` can be populated on the source implementation.
contract IfaceClaimer {
    bytes4 private immutable _id;

    constructor(bytes4 id_) {
        _id = id_;
    }

    function supportsInterface(bytes4 _interfaceId) external view returns (bool) {
        return _interfaceId == _id || _interfaceId == 0x01ffc9a7; // ERC-165
    }
}

/// @dev No-op subdomain registrar. v1.0.0 `registerPluginRepo` demands a
/// non-empty subdomain and unconditionally calls `registerSubnode`, so a real
/// ENS wiring would be needed just to seed an entry — this stub short-circuits
/// that (v1.3.0 uses the same `registerSubnode(bytes32,address)` selector) while
/// letting the stored `subdomainRegistrar` be a preservation target.
contract StubRegistrar {
    function registerSubnode(bytes32, address) external {}
}

// Legacy -> current upgrade regression for PluginRepoRegistry, restoring the
// `upgrades from v1.0.0` and `from v1.3.0` cases from the TS suite
// (packages/contracts/test/framework/plugin/plugin-repo-registry.ts). Both old
// versions are exercised as the SOURCE, upgrading to the current (v1.4.0) impl
// as destination. v1.0.0 pulls its own `DaoAuthorizableUpgradeable`, v1.3.0 the
// remapped current one, so the two paths validate different base-class layouts
// against the destination. The auth gate is covered by
// test/framework/plugin/repo/PluginRepoRegistry.t.sol. No PluginRepoRegistry
// version defines `initializeFrom`, so each hop is a bare `upgradeTo`.
//
// protocolVersion note (same as DAORegistryUpgrade.t.sol): the osx-commons
// remapping makes the recompiled v1.3.0 source report the current
// ProtocolVersion, so its hop asserts storage preservation only; the v1.0.0 hop
// is the one honest reverting->tuple transition. Requires `just
// test-upgrade-setup` + `FOUNDRY_PROFILE=upgrade`.
contract PluginRepoRegistryUpgradeTest is Test {
    DAOMock internal managingDao;
    StubRegistrar internal registrar;
    string internal constant SUBDOMAIN = "my-plugin-repo";

    function setUp() public {
        managingDao = new DAOMock();
        managingDao.setHasPermissionReturnValueMock(true); // REGISTER_PLUGIN_REPO + UPGRADE_REGISTRY
        registrar = new StubRegistrar();
    }

    // -------------------------------------------------------------------------
    // v1.0.0 → current (v1.4.0)
    // -------------------------------------------------------------------------

    function test_upgrade_v1_0_0_to_current_preservesState() public {
        (address proxy, address registeredRepo, bytes4 targetId) =
            _deploySeededProxy(address(new PluginRepoRegistryV1_0_0()));

        // v1.0.0 predates ProtocolVersion — the selector is not in the impl.
        (bool ok, ) = proxy.call(abi.encodeWithSignature("protocolVersion()"));
        assertFalse(ok, "v1.0.0 must not expose protocolVersion()");

        PluginRepoRegistry implCurrent = new PluginRepoRegistry();
        PluginRepoRegistry(proxy).upgradeTo(address(implCurrent));

        _assertStatePreserved(proxy, registeredRepo, targetId);
        _assertImplIs(proxy, address(implCurrent));

        uint8[3] memory v = PluginRepoRegistry(proxy).protocolVersion();
        assertEq(v[0], 1);
        assertEq(v[1], 4);
        assertEq(v[2], 0);
    }

    // -------------------------------------------------------------------------
    // v1.3.0 → current (v1.4.0)
    // -------------------------------------------------------------------------

    function test_upgrade_v1_3_0_to_current_preservesState() public {
        (address proxy, address registeredRepo, bytes4 targetId) =
            _deploySeededProxy(address(new PluginRepoRegistryV1_3_0()));

        PluginRepoRegistry implCurrent = new PluginRepoRegistry();
        PluginRepoRegistry(proxy).upgradeTo(address(implCurrent));

        _assertStatePreserved(proxy, registeredRepo, targetId);
        _assertImplIs(proxy, address(implCurrent));

        // [1,4,0] before and after (remapped mixin); storage preservation is the
        // load-bearing check for this hop.
        uint8[3] memory v = PluginRepoRegistry(proxy).protocolVersion();
        assertEq(v[0], 1);
        assertEq(v[1], 4);
        assertEq(v[2], 0);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    function _deploySeededProxy(address impl)
        internal
        returns (address proxy, address registeredRepo, bytes4 targetId)
    {
        proxy = address(
            new ERC1967Proxy(
                impl,
                abi.encodeCall(
                    PluginRepoRegistry.initialize,
                    (IDAO(address(managingDao)), ENSSubdomainRegistrar(address(registrar)))
                )
            )
        );
        targetId = PluginRepoRegistry(proxy).targetInterfaceId();
        registeredRepo = address(new IfaceClaimer(targetId));
        PluginRepoRegistry(proxy).registerPluginRepo(SUBDOMAIN, registeredRepo);
    }

    function _assertStatePreserved(address proxy, address registeredRepo, bytes4 targetId) internal view {
        assertTrue(PluginRepoRegistry(proxy).entries(registeredRepo), "entry preserved across upgrade");
        assertEq(address(PluginRepoRegistry(proxy).subdomainRegistrar()), address(registrar), "registrar preserved");
        assertEq(PluginRepoRegistry(proxy).targetInterfaceId(), targetId, "targetInterfaceId preserved");
        assertEq(address(PluginRepoRegistry(proxy).dao()), address(managingDao), "managing DAO preserved");
    }

    function _assertImplIs(address proxy, address impl) internal view {
        bytes32 implSlot = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
        assertEq(address(uint160(uint256(vm.load(proxy, implSlot)))), impl, "implementation slot updated");
    }
}
