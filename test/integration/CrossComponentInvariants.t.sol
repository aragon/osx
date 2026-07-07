// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {ENSRegistry} from "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {DAOFactory} from "../../src/framework/dao/DAOFactory.sol";
import {DAORegistry} from "../../src/framework/dao/DAORegistry.sol";
import {PluginRepoRegistry} from "../../src/framework/plugin/repo/PluginRepoRegistry.sol";
import {PluginRepoFactory} from "../../src/framework/plugin/repo/PluginRepoFactory.sol";
import {PluginRepo} from "../../src/framework/plugin/repo/PluginRepo.sol";
import {PluginSetupProcessor} from "../../src/framework/plugin/setup/PluginSetupProcessor.sol";
import {PluginSetupRef, _getPluginInstallationId} from "../../src/framework/plugin/setup/PluginSetupProcessorHelpers.sol";
import {ENSSubdomainRegistrar} from "../../src/framework/utils/ens/ENSSubdomainRegistrar.sol";
import {DAO} from "../../src/core/dao/DAO.sol";
import {PermissionManager} from "../../src/core/permission/PermissionManager.sol";
import {IDAO} from "../../src/common/dao/IDAO.sol";
import {DAOMock} from "../mocks/commons/dao/DAOMock.sol";
import {MockResolver} from "../framework/member/mocks/MockResolver.sol";
import {PluginUUPSUpgradeableSetupV1Mock} from "../mocks/plugin/UUPSUpgradeable/PluginUUPSUpgradeableSetupMock.sol";
import {PluginUUPSUpgradeableV1Mock} from "../mocks/plugin/UUPSUpgradeable/PluginUUPSUpgradeableMock.sol";

/// @notice System-level invariant tests that compose the full OSx stack —
/// DAOFactory, DAORegistry, PluginRepoRegistry, PluginSetupProcessor,
/// PluginRepoFactory, ENSSubdomainRegistrar — to assert properties that no
/// per-component test could fully verify on its own.
///
/// These are "catastrophic-prevention" checks: each invariant guards against
/// a failure that would compromise every DAO ever created through the
/// factory.
contract CrossComponentInvariantsTest is Test {
    bytes32 internal constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION");
    bytes32 internal constant UPGRADE_DAO_PERMISSION_ID = keccak256("UPGRADE_DAO_PERMISSION");
    bytes32 internal constant SET_TRUSTED_FORWARDER_PERMISSION_ID = keccak256("SET_TRUSTED_FORWARDER_PERMISSION");
    bytes32 internal constant SET_METADATA_PERMISSION_ID = keccak256("SET_METADATA_PERMISSION");
    bytes32 internal constant REGISTER_STANDARD_CALLBACK_PERMISSION_ID =
        keccak256("REGISTER_STANDARD_CALLBACK_PERMISSION");
    bytes32 internal constant EXECUTE_PERMISSION_ID = keccak256("EXECUTE_PERMISSION");
    bytes32 internal constant APPLY_INSTALLATION_PERMISSION_ID = keccak256("APPLY_INSTALLATION_PERMISSION");
    bytes32 internal constant APPLY_UPDATE_PERMISSION_ID = keccak256("APPLY_UPDATE_PERMISSION");
    bytes32 internal constant APPLY_UNINSTALLATION_PERMISSION_ID = keccak256("APPLY_UNINSTALLATION_PERMISSION");

    address internal constant ANY_ADDR = address(type(uint160).max);

    bytes32 internal constant DAO_ETH_NODE = 0x4adec6e9f748b29857b9a275dcb59bd0254a069a7e20cab4ec591499254f119a;
    bytes32 internal constant ETH_LABEL = keccak256("eth");
    bytes32 internal constant DAO_LABEL = keccak256("dao");

    DAOMock internal managingDao;
    ENSRegistry internal ens;
    MockResolver internal resolver;
    ENSSubdomainRegistrar internal subdomainRegistrar;
    DAORegistry internal daoRegistry;
    PluginRepoRegistry internal pluginRepoRegistry;
    PluginSetupProcessor internal psp;
    PluginRepoFactory internal pluginRepoFactory;
    DAOFactory internal daoFactory;

    PluginUUPSUpgradeableSetupV1Mock internal pluginSetupV1Mock;
    PluginRepo internal pluginRepo;

    function setUp() public {
        managingDao = new DAOMock();
        managingDao.setHasPermissionReturnValueMock(true);

        ens = new ENSRegistry();
        resolver = new MockResolver(ENS(address(ens)));
        ens.setSubnodeRecord(bytes32(0), ETH_LABEL, address(this), address(resolver), 0);
        ens.setSubnodeRecord(
            keccak256(abi.encodePacked(bytes32(0), ETH_LABEL)), DAO_LABEL, address(this), address(resolver), 0
        );

        ENSSubdomainRegistrar registrarImpl = new ENSSubdomainRegistrar();
        subdomainRegistrar = ENSSubdomainRegistrar(address(new ERC1967Proxy(address(registrarImpl), "")));
        ens.setOwner(DAO_ETH_NODE, address(subdomainRegistrar));
        subdomainRegistrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), DAO_ETH_NODE);

        DAORegistry daoRegistryImpl = new DAORegistry();
        daoRegistry = DAORegistry(
            address(
                new ERC1967Proxy(
                    address(daoRegistryImpl),
                    abi.encodeCall(DAORegistry.initialize, (IDAO(address(managingDao)), subdomainRegistrar))
                )
            )
        );

        PluginRepoRegistry pluginRepoRegistryImpl = new PluginRepoRegistry();
        pluginRepoRegistry = PluginRepoRegistry(
            address(
                new ERC1967Proxy(
                    address(pluginRepoRegistryImpl),
                    abi.encodeCall(PluginRepoRegistry.initialize, (IDAO(address(managingDao)), subdomainRegistrar))
                )
            )
        );

        psp = new PluginSetupProcessor(pluginRepoRegistry);
        pluginRepoFactory = new PluginRepoFactory(pluginRepoRegistry);
        daoFactory = new DAOFactory(daoRegistry, psp);

        PluginUUPSUpgradeableV1Mock pluginImplV1 = new PluginUUPSUpgradeableV1Mock();
        pluginSetupV1Mock = new PluginUUPSUpgradeableSetupV1Mock(address(pluginImplV1));
        pluginRepo = pluginRepoFactory.createPluginRepoWithFirstVersion(
            "plugin-uups-mock", address(pluginSetupV1Mock), address(this), hex"00", hex"00"
        );
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    function _defaultSettings(string memory subdomain) internal pure returns (DAOFactory.DAOSettings memory) {
        return DAOFactory.DAOSettings({
            trustedForwarder: address(0), daoURI: "https://example.org", subdomain: subdomain, metadata: hex"0000"
        });
    }

    function _installationData(uint8 release, uint16 build) internal view returns (DAOFactory.PluginSettings memory) {
        return DAOFactory.PluginSettings({
            pluginSetupRef: PluginSetupRef({
                versionTag: PluginRepo.Tag({release: release, build: build}), pluginSetupRepo: pluginRepo
            }),
            data: ""
        });
    }

    function _createDaoWithoutPlugins(string memory subdomain) internal returns (DAO) {
        (DAO d,) = daoFactory.createDao(_defaultSettings(subdomain), new DAOFactory.PluginSettings[](0));
        return d;
    }

    function _createDaoWithOnePlugin(string memory subdomain) internal returns (DAO) {
        DAOFactory.PluginSettings[] memory ps = new DAOFactory.PluginSettings[](1);
        ps[0] = _installationData(1, 1);
        (DAO d,) = daoFactory.createDao(_defaultSettings(subdomain), ps);
        return d;
    }

    function _createDaoWithOnePluginAndGetAddrs(string memory subdomain)
        internal
        returns (DAO dao, address plugin)
    {
        DAOFactory.PluginSettings[] memory ps = new DAOFactory.PluginSettings[](1);
        ps[0] = _installationData(1, 1);
        DAOFactory.InstalledPlugin[] memory installed;
        (dao, installed) = daoFactory.createDao(_defaultSettings(subdomain), ps);
        plugin = installed[0].plugin;
    }

    // -------------------------------------------------------------------------
    // O15: catastrophic-prevention — factory + PSP never retain unintended
    // permissions on freshly-created DAOs
    // -------------------------------------------------------------------------

    /// After `createDao` (no plugins), the factory must hold ZERO permissions
    /// on the new DAO. Probe each known permission individually — if any
    /// future refactor accidentally leaves the factory with ROOT or other
    /// permissions, every DAO it creates would be at the factory's mercy.
    function test_factoryHasNoPermissionsAfterCreateDao_withoutPlugins() public {
        DAO d = _createDaoWithoutPlugins("dao1");
        _assertFactoryHasNothing(d);
    }

    /// Same invariant in the with-plugins branch (which uses additional temp
    /// grants that must be revoked at the end).
    function test_factoryHasNoPermissionsAfterCreateDao_withPlugins() public {
        DAO d = _createDaoWithOnePlugin("dao1");
        _assertFactoryHasNothing(d);
    }

    function _assertFactoryHasNothing(DAO d) internal view {
        address f = address(daoFactory);
        assertFalse(d.hasPermission(address(d), f, ROOT_PERMISSION_ID, ""), "factory ROOT");
        assertFalse(d.hasPermission(address(d), f, UPGRADE_DAO_PERMISSION_ID, ""), "factory UPGRADE_DAO");
        assertFalse(d.hasPermission(address(d), f, SET_METADATA_PERMISSION_ID, ""), "factory SET_METADATA");
        assertFalse(
            d.hasPermission(address(d), f, SET_TRUSTED_FORWARDER_PERMISSION_ID, ""), "factory SET_TRUSTED_FORWARDER"
        );
        assertFalse(
            d.hasPermission(address(d), f, REGISTER_STANDARD_CALLBACK_PERMISSION_ID, ""),
            "factory REGISTER_STANDARD_CALLBACK"
        );
        assertFalse(d.hasPermission(address(d), f, EXECUTE_PERMISSION_ID, ""), "factory EXECUTE");
    }

    /// PSP only ever receives `ROOT_PERMISSION_ID` on a DAO during plugin
    /// install, and that grant is revoked before `createDao` returns. PSP
    /// must NEVER hold any other permission on the DAO. Catastrophic if
    /// false — PSP holding EXECUTE or UPGRADE_DAO on every freshly-created
    /// DAO would let any caller compromise it via the PSP entrypoint.
    function test_pspHasNoPermissionsAfterCreateDao_withPlugins() public {
        DAO d = _createDaoWithOnePlugin("dao1");
        address p = address(psp);
        assertFalse(d.hasPermission(address(d), p, ROOT_PERMISSION_ID, ""), "PSP ROOT");
        assertFalse(d.hasPermission(address(d), p, UPGRADE_DAO_PERMISSION_ID, ""), "PSP UPGRADE_DAO");
        assertFalse(d.hasPermission(address(d), p, EXECUTE_PERMISSION_ID, ""), "PSP EXECUTE");
        assertFalse(d.hasPermission(address(d), p, SET_METADATA_PERMISSION_ID, ""), "PSP SET_METADATA");
        // The reverse permission (factory holds APPLY_INSTALLATION on PSP)
        // is also revoked at the end of the with-plugins branch.
        assertFalse(
            d.hasPermission(p, address(daoFactory), APPLY_INSTALLATION_PERMISSION_ID, ""),
            "factory APPLY_INSTALLATION on PSP"
        );
    }

    // -------------------------------------------------------------------------
    // INV-1: permission monotonicity — ROOT and DAO-restricted permissions
    // can NEVER be granted to ANY_ADDR under any sequence of grant calls
    // -------------------------------------------------------------------------

    /// Random fuzz over arbitrary permission ids: every attempt to grant
    /// `ROOT_PERMISSION_ID` (or any of the DAO-restricted permissions) to
    /// `ANY_ADDR` MUST revert. The invariant holds across the full input
    /// space — locks in the PermissionManager guard.
    function testFuzz_inv1_rootAndRestrictedNeverGrantableToAnyAddr(bytes32 permissionId) public {
        // Fresh DAO; the DAO holds ROOT on itself, so we prank as the DAO.
        DAO d = _createDaoWithoutPlugins("inv1-dao");

        // Canonical restricted-for-ANY_ADDR set + ROOT.
        bytes32[6] memory restricted = [
            ROOT_PERMISSION_ID,
            EXECUTE_PERMISSION_ID,
            UPGRADE_DAO_PERMISSION_ID,
            SET_METADATA_PERMISSION_ID,
            SET_TRUSTED_FORWARDER_PERMISSION_ID,
            REGISTER_STANDARD_CALLBACK_PERMISSION_ID
        ];

        bool isRestricted;
        for (uint256 i = 0; i < restricted.length; i++) {
            if (permissionId == restricted[i]) {
                isRestricted = true;
                break;
            }
        }

        if (isRestricted) {
            vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
            vm.prank(address(d));
            d.grant(address(d), ANY_ADDR, permissionId);
        } else {
            vm.prank(address(d));
            d.grant(address(d), ANY_ADDR, permissionId);
            assertTrue(d.hasPermission(address(d), address(0xBEEF), permissionId, ""));
        }
    }

    // -------------------------------------------------------------------------
    // O3: multi-DAO isolation — two independent DAOs share no permission
    // state, no registry conflation, no plugin-install state conflation
    // -------------------------------------------------------------------------

    /// Granting EXECUTE on DAO1 to a third party does NOT grant EXECUTE on
    /// DAO2 to the same third party. The permission graphs are fully
    /// separate per-DAO.
    function test_multiDao_permissionGrantsAreIsolated() public {
        DAO dao1 = _createDaoWithoutPlugins("dao-one");
        DAO dao2 = _createDaoWithoutPlugins("dao-two");
        address operator = makeAddr("operator");

        // The `createDao` caller (this contract) receives EXECUTE on DAO1
        // and DAO2 (no-plugins branch). To grant on DAO1, this contract
        // needs ROOT on DAO1 — but it doesn't (factory revoked own ROOT
        // and DAO holds ROOT on itself). Instead, drive the test from the
        // DAO's self-ROOT: prank as the DAO.
        vm.prank(address(dao1));
        dao1.grant(address(dao1), operator, EXECUTE_PERMISSION_ID);

        assertTrue(dao1.hasPermission(address(dao1), operator, EXECUTE_PERMISSION_ID, ""), "operator has EXECUTE on dao1");
        assertFalse(
            dao2.hasPermission(address(dao2), operator, EXECUTE_PERMISSION_ID, ""),
            "operator must NOT have EXECUTE on dao2"
        );
    }

    /// `DAORegistry.entries` contains BOTH DAOs after consecutive creates;
    /// PluginRepoRegistry is unaffected. Locks in registry scope isolation.
    function test_multiDao_registriesScopedCorrectly() public {
        DAO dao1 = _createDaoWithoutPlugins("dao-one");
        DAO dao2 = _createDaoWithoutPlugins("dao-two");
        assertTrue(daoRegistry.entries(address(dao1)));
        assertTrue(daoRegistry.entries(address(dao2)));
        // PluginRepoRegistry is for plugin repos only — DAOs are not in it.
        assertFalse(pluginRepoRegistry.entries(address(dao1)));
        assertFalse(pluginRepoRegistry.entries(address(dao2)));
    }

    /// Two DAOs each get their own plugin proxy AND their own entry in PSP's
    /// `states` map (keyed by `(dao, plugin)`). Both installation ids are
    /// distinct AND both map to a non-zero `currentAppliedSetupId` —
    /// confirming the install state is truly isolated, not just the
    /// addresses.
    function test_multiDao_pluginInstallStateIsolated() public {
        (DAO dao1, address plugin1) = _createDaoWithOnePluginAndGetAddrs("dao-with-plugin-1");
        (DAO dao2, address plugin2) = _createDaoWithOnePluginAndGetAddrs("dao-with-plugin-2");

        assertTrue(address(dao1) != address(dao2));
        assertTrue(plugin1 != plugin2);

        bytes32 id1 = _getPluginInstallationId(address(dao1), plugin1);
        bytes32 id2 = _getPluginInstallationId(address(dao2), plugin2);
        assertTrue(id1 != id2, "installation ids distinct");

        (uint256 block1, bytes32 applied1) = psp.states(id1);
        (uint256 block2, bytes32 applied2) = psp.states(id2);
        assertTrue(block1 != 0 && applied1 != bytes32(0), "dao1 install latched");
        assertTrue(block2 != 0 && applied2 != bytes32(0), "dao2 install latched");

        // Cross-probe: dao1's installationId for dao2's plugin (and vice
        // versa) must NOT exist in PSP.states. Confirms keyed-by-(dao, plugin)
        // — no cross-DAO conflation even when both repos / setups match.
        bytes32 cross1 = _getPluginInstallationId(address(dao1), plugin2);
        bytes32 cross2 = _getPluginInstallationId(address(dao2), plugin1);
        (uint256 cBlock1, bytes32 cApplied1) = psp.states(cross1);
        (uint256 cBlock2, bytes32 cApplied2) = psp.states(cross2);
        assertEq(cBlock1, 0, "no cross-DAO entry for (dao1, plugin2)");
        assertEq(cApplied1, bytes32(0));
        assertEq(cBlock2, 0, "no cross-DAO entry for (dao2, plugin1)");
        assertEq(cApplied2, bytes32(0));
    }
}
