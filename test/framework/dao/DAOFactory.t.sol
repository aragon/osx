// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {ENSRegistry} from "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import {DAOFactory} from "../../../src/framework/dao/DAOFactory.sol";
import {DAORegistry} from "../../../src/framework/dao/DAORegistry.sol";
import {PluginRepoRegistry} from "../../../src/framework/plugin/repo/PluginRepoRegistry.sol";
import {PluginRepoFactory} from "../../../src/framework/plugin/repo/PluginRepoFactory.sol";
import {PluginRepo} from "../../../src/framework/plugin/repo/PluginRepo.sol";
import {PluginSetupProcessor} from "../../../src/framework/plugin/setup/PluginSetupProcessor.sol";
import {PluginSetupRef} from "../../../src/framework/plugin/setup/PluginSetupProcessorHelpers.sol";
import {ENSSubdomainRegistrar} from "../../../src/framework/utils/ens/ENSSubdomainRegistrar.sol";
import {DAO} from "../../../src/core/dao/DAO.sol";
import {IDAO} from "../../../src/common/dao/IDAO.sol";
import {IProtocolVersion} from "../../../src/common/utils/versioning/IProtocolVersion.sol";
import {DAOMock} from "../../mocks/commons/dao/DAOMock.sol";
import {MockResolver} from "../member/mocks/MockResolver.sol";
import {PluginUUPSUpgradeableSetupV1Mock} from "../../mocks/plugin/UUPSUpgradeable/PluginUUPSUpgradeableSetupMock.sol";
import {PluginUUPSUpgradeableV1Mock} from "../../mocks/plugin/UUPSUpgradeable/PluginUUPSUpgradeableMock.sol";

/// @notice Direct tests for `DAOFactory` in `src/framework/dao/DAOFactory.sol`.
///
/// Ports `packages/contracts/test/framework/dao/dao-factory.ts` (667 lines,
/// 12 cases). Wires up the full create-DAO-and-install-plugins stack with
/// real `ENSRegistry`, `ENSSubdomainRegistrar`, `DAORegistry`,
/// `PluginRepoRegistry`, `PluginSetupProcessor`, `PluginRepoFactory`, and
/// `DAOFactory`. A real `PluginRepo` with `(release 1, build 1)` is published
/// in `setUp`, mirroring the TS fixture. The managing DAO is `DAOMock` with
/// allow-all permissions, which lets us skip the cross-component `dao.grant`
/// dance the TS performs.
contract DAOFactoryTest is Test {
    bytes32 internal constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION");
    bytes32 internal constant UPGRADE_DAO_PERMISSION_ID = keccak256("UPGRADE_DAO_PERMISSION");
    bytes32 internal constant SET_TRUSTED_FORWARDER_PERMISSION_ID = keccak256("SET_TRUSTED_FORWARDER_PERMISSION");
    bytes32 internal constant SET_METADATA_PERMISSION_ID = keccak256("SET_METADATA_PERMISSION");
    bytes32 internal constant REGISTER_STANDARD_CALLBACK_PERMISSION_ID =
        keccak256("REGISTER_STANDARD_CALLBACK_PERMISSION");
    bytes32 internal constant EXECUTE_PERMISSION_ID = keccak256("EXECUTE_PERMISSION");
    bytes32 internal constant APPLY_INSTALLATION_PERMISSION_ID = keccak256("APPLY_INSTALLATION_PERMISSION");

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
    bytes internal constant EMPTY_BYTES = "";
    bytes internal constant DUMMY_METADATA = hex"0000";
    string internal constant DUMMY_SUBDOMAIN = "dao1";
    string internal constant DAO_URI = "https://example.org";

    function setUp() public {
        managingDao = new DAOMock();
        managingDao.setHasPermissionReturnValueMock(true);

        // --- ENS stack ----
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

        // --- Registries ----
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

        // --- Processors and factories ----
        psp = new PluginSetupProcessor(pluginRepoRegistry);
        pluginRepoFactory = new PluginRepoFactory(pluginRepoRegistry);
        daoFactory = new DAOFactory(daoRegistry, psp);

        // --- Publish (release 1, build 1) on a fresh plugin repo ----
        PluginUUPSUpgradeableV1Mock pluginImplV1 = new PluginUUPSUpgradeableV1Mock();
        pluginSetupV1Mock = new PluginUUPSUpgradeableSetupV1Mock(address(pluginImplV1));

        pluginRepo = pluginRepoFactory.createPluginRepoWithFirstVersion(
            "plugin-uups-mock", address(pluginSetupV1Mock), address(this), hex"00", hex"00"
        );
    }

    // -------------------------------------------------------------------------
    // Helper builders
    // -------------------------------------------------------------------------

    function _defaultDaoSettings() internal pure returns (DAOFactory.DAOSettings memory) {
        return DAOFactory.DAOSettings({
            trustedForwarder: address(0), daoURI: DAO_URI, subdomain: DUMMY_SUBDOMAIN, metadata: DUMMY_METADATA
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

    // -------------------------------------------------------------------------
    // ERC-165
    // -------------------------------------------------------------------------

    function test_supportsInterface_returnsFalseForEmptyInterface() public view {
        assertFalse(daoFactory.supportsInterface(0xffffffff));
    }

    function test_supportsInterface_IERC165() public view {
        assertTrue(daoFactory.supportsInterface(type(IERC165).interfaceId));
    }

    function test_supportsInterface_IProtocolVersion() public view {
        assertTrue(daoFactory.supportsInterface(type(IProtocolVersion).interfaceId));
    }

    // -------------------------------------------------------------------------
    // Protocol version
    // -------------------------------------------------------------------------

    function test_protocolVersion_returnsCurrent() public view {
        uint8[3] memory v = daoFactory.protocolVersion();
        assertEq(v[0], 1);
        assertEq(v[1], 4);
        assertEq(v[2], 0);
    }

    // -------------------------------------------------------------------------
    // createDao — with plugins
    // -------------------------------------------------------------------------

    function test_createDao_withPlugin_initializesDAOAndEmitsRegistration() public {
        DAOFactory.PluginSettings[] memory plugins = new DAOFactory.PluginSettings[](1);
        plugins[0] = _installationData(1, 1);

        vm.recordLogs();
        (DAO createdDao, DAOFactory.InstalledPlugin[] memory installed) =
            daoFactory.createDao(_defaultDaoSettings(), plugins);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        // The DAORegistry must have logged DAORegistered(dao, creator, subdomain).
        bytes32 registeredTopic = keccak256("DAORegistered(address,address,string)");
        bool sawRegistered;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(daoRegistry) && logs[i].topics[0] == registeredTopic) {
                address loggedDao = address(uint160(uint256(logs[i].topics[1])));
                address loggedCreator = address(uint160(uint256(logs[i].topics[2])));
                assertEq(loggedDao, address(createdDao));
                assertEq(loggedCreator, address(this));
                sawRegistered = true;
                break;
            }
        }
        assertTrue(sawRegistered, "DAORegistered not emitted");
        assertEq(installed.length, 1);
        assertTrue(installed[0].plugin != address(0));
    }

    function test_createDao_withPlugin_setsPluginPermissionsOnDAO() public {
        DAOFactory.PluginSettings[] memory plugins = new DAOFactory.PluginSettings[](1);
        plugins[0] = _installationData(1, 1);

        (DAO createdDao, DAOFactory.InstalledPlugin[] memory installed) =
            daoFactory.createDao(_defaultDaoSettings(), plugins);

        // The mock setup grants a small set of MOCK_PERMISSION permissions.
        // Every (where, who, permissionId) it requested must be live on the DAO.
        for (uint256 i = 0; i < installed[0].preparedSetupData.permissions.length; i++) {
            assertTrue(
                createdDao.hasPermission(
                    installed[0].preparedSetupData.permissions[i].where,
                    installed[0].preparedSetupData.permissions[i].who,
                    installed[0].preparedSetupData.permissions[i].permissionId,
                    ""
                )
            );
        }
    }

    function test_createDao_withPlugin_setsDAOOwnPermissions() public {
        DAOFactory.PluginSettings[] memory plugins = new DAOFactory.PluginSettings[](1);
        plugins[0] = _installationData(1, 1);

        (DAO createdDao,) = daoFactory.createDao(_defaultDaoSettings(), plugins);

        // The DAO must hold all five self-permissions on itself.
        assertTrue(createdDao.hasPermission(address(createdDao), address(createdDao), ROOT_PERMISSION_ID, ""));
        assertTrue(createdDao.hasPermission(address(createdDao), address(createdDao), UPGRADE_DAO_PERMISSION_ID, ""));
        assertTrue(
            createdDao.hasPermission(address(createdDao), address(createdDao), SET_TRUSTED_FORWARDER_PERMISSION_ID, "")
        );
        assertTrue(createdDao.hasPermission(address(createdDao), address(createdDao), SET_METADATA_PERMISSION_ID, ""));
        assertTrue(
            createdDao.hasPermission(
                address(createdDao), address(createdDao), REGISTER_STANDARD_CALLBACK_PERMISSION_ID, ""
            )
        );
    }

    function test_createDao_withPlugin_revokesTemporaryPermissionsFromFactoryAndPSP() public {
        DAOFactory.PluginSettings[] memory plugins = new DAOFactory.PluginSettings[](1);
        plugins[0] = _installationData(1, 1);

        (DAO createdDao,) = daoFactory.createDao(_defaultDaoSettings(), plugins);

        // ROOT must be revoked from BOTH the factory and the PSP.
        assertFalse(createdDao.hasPermission(address(createdDao), address(daoFactory), ROOT_PERMISSION_ID, ""));
        assertFalse(createdDao.hasPermission(address(createdDao), address(psp), ROOT_PERMISSION_ID, ""));

        // APPLY_INSTALLATION must be revoked from the factory on the PSP.
        assertFalse(createdDao.hasPermission(address(psp), address(daoFactory), APPLY_INSTALLATION_PERMISSION_ID, ""));
    }

    function test_createDao_withMultiplePlugins_emitsTwoInstallationApplied() public {
        // Publish (release 1, build 2) so we have two distinct installation
        // refs that won't collide with each other.
        pluginRepo.createVersion(1, address(pluginSetupV1Mock), hex"11", hex"11");

        DAOFactory.PluginSettings[] memory plugins = new DAOFactory.PluginSettings[](2);
        plugins[0] = _installationData(1, 1);
        plugins[1] = _installationData(1, 2);

        vm.recordLogs();
        daoFactory.createDao(_defaultDaoSettings(), plugins);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 installedTopic = keccak256("InstallationApplied(address,address,bytes32,bytes32)");
        uint256 count;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(psp) && logs[i].topics[0] == installedTopic) {
                count++;
            }
        }
        assertEq(count, 2);
    }

    function test_createDao_withPlugin_returnsInstalledPluginsArrayCorrectly() public {
        pluginRepo.createVersion(1, address(pluginSetupV1Mock), hex"11", hex"11");

        DAOFactory.PluginSettings[] memory plugins = new DAOFactory.PluginSettings[](2);
        plugins[0] = _installationData(1, 1);
        plugins[1] = _installationData(1, 2);

        (DAO createdDao, DAOFactory.InstalledPlugin[] memory installed) =
            daoFactory.createDao(_defaultDaoSettings(), plugins);

        assertEq(installed.length, 2);
        assertTrue(installed[0].plugin != address(0));
        assertTrue(installed[1].plugin != address(0));
        // Each plugin gets distinct prepared setup data.
        assertTrue(installed[0].plugin != installed[1].plugin);
        assertTrue(address(createdDao) != address(0));
    }

    // -------------------------------------------------------------------------
    // createDao — without plugins
    // -------------------------------------------------------------------------

    function test_createDao_withoutPlugins_initializesDAOAndEmitsRegistration() public {
        DAOFactory.PluginSettings[] memory plugins = new DAOFactory.PluginSettings[](0);

        vm.recordLogs();
        (DAO createdDao,) = daoFactory.createDao(_defaultDaoSettings(), plugins);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 registeredTopic = keccak256("DAORegistered(address,address,string)");
        bool sawRegistered;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(daoRegistry) && logs[i].topics[0] == registeredTopic) {
                address loggedDao = address(uint160(uint256(logs[i].topics[1])));
                assertEq(loggedDao, address(createdDao));
                sawRegistered = true;
                break;
            }
        }
        assertTrue(sawRegistered, "DAORegistered not emitted");
    }

    function test_createDao_withoutPlugins_setsDAOOwnPermissions() public {
        (DAO createdDao,) = daoFactory.createDao(_defaultDaoSettings(), new DAOFactory.PluginSettings[](0));

        assertTrue(createdDao.hasPermission(address(createdDao), address(createdDao), ROOT_PERMISSION_ID, ""));
        assertTrue(createdDao.hasPermission(address(createdDao), address(createdDao), UPGRADE_DAO_PERMISSION_ID, ""));
        assertTrue(
            createdDao.hasPermission(address(createdDao), address(createdDao), SET_TRUSTED_FORWARDER_PERMISSION_ID, "")
        );
        assertTrue(createdDao.hasPermission(address(createdDao), address(createdDao), SET_METADATA_PERMISSION_ID, ""));
        assertTrue(
            createdDao.hasPermission(
                address(createdDao), address(createdDao), REGISTER_STANDARD_CALLBACK_PERMISSION_ID, ""
            )
        );
    }

    function test_createDao_withoutPlugins_revokesRootFromFactory() public {
        (DAO createdDao,) = daoFactory.createDao(_defaultDaoSettings(), new DAOFactory.PluginSettings[](0));

        // ROOT is revoked from the factory after `_setDAOPermissions` runs.
        assertFalse(createdDao.hasPermission(address(createdDao), address(daoFactory), ROOT_PERMISSION_ID, ""));
    }

    function test_createDao_withoutPlugins_grantsExecuteToCaller() public {
        (DAO createdDao,) = daoFactory.createDao(_defaultDaoSettings(), new DAOFactory.PluginSettings[](0));

        // The caller (`address(this)`) is the creator and must hold EXECUTE.
        assertTrue(createdDao.hasPermission(address(createdDao), address(this), EXECUTE_PERMISSION_ID, ""));
    }

    function test_createDao_withoutPlugins_returnsEmptyInstalledPluginsArray() public {
        (DAO createdDao, DAOFactory.InstalledPlugin[] memory installed) =
            daoFactory.createDao(_defaultDaoSettings(), new DAOFactory.PluginSettings[](0));

        assertEq(installed.length, 0);
        assertTrue(address(createdDao) != address(0));
    }

    // -------------------------------------------------------------------------
    // Constructor surface
    // -------------------------------------------------------------------------

    function test_constructor_storesRegistryAndPSP() public view {
        assertEq(address(daoFactory.daoRegistry()), address(daoRegistry));
        assertEq(address(daoFactory.pluginSetupProcessor()), address(psp));
    }

    function test_constructor_deploysFreshDAOBase() public view {
        address base = daoFactory.daoBase();
        assertTrue(base != address(0));
        assertTrue(base.code.length > 0);
    }
}
