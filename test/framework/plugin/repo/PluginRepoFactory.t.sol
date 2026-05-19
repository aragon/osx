// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {ENSRegistry} from "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import {PluginRepoFactory} from "../../../../src/framework/plugin/repo/PluginRepoFactory.sol";
import {PluginRepoRegistry} from "../../../../src/framework/plugin/repo/PluginRepoRegistry.sol";
import {PluginRepo} from "../../../../src/framework/plugin/repo/PluginRepo.sol";
import {ENSSubdomainRegistrar} from "../../../../src/framework/utils/ens/ENSSubdomainRegistrar.sol";
import {IDAO} from "../../../../src/common/dao/IDAO.sol";
import {DaoUnauthorized} from "../../../../src/common/permission/auth/auth.sol";
import {IProtocolVersion} from "../../../../src/common/utils/versioning/IProtocolVersion.sol";
import {DAOMock} from "../../../mocks/commons/dao/DAOMock.sol";
import {MockResolver} from "../../member/mocks/MockResolver.sol";
import {
    PluginUUPSUpgradeableSetupV1Mock
} from "../../../mocks/plugin/UUPSUpgradeable/PluginUUPSUpgradeableSetupMock.sol";
import {PluginUUPSUpgradeableV1Mock} from "../../../mocks/plugin/UUPSUpgradeable/PluginUUPSUpgradeableMock.sol";

/// @notice Direct tests for `PluginRepoFactory` in
/// `src/framework/plugin/repo/PluginRepoFactory.sol`.
///
/// Ports `packages/contracts/test/framework/plugin/plugin-repo-factory.ts`
/// (261 lines, 9 cases). Uses the real `ENSRegistry` + real
/// `ENSSubdomainRegistrar` + real `PluginRepoRegistry` end-to-end so the
/// full create-and-register path is exercised. Adds: expected-address
/// pre-computation via `vm.computeCreateAddress`, explicit assertion that
/// the factory revokes its temporary self-grants in `createPluginRepoWithFirstVersion`.
contract PluginRepoFactoryTest is Test {
    bytes32 internal constant REGISTER_PLUGIN_REPO_PERMISSION_ID = keccak256("REGISTER_PLUGIN_REPO_PERMISSION");
    bytes32 internal constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION");
    bytes32 internal constant MAINTAINER_PERMISSION_ID = keccak256("MAINTAINER_PERMISSION");
    bytes32 internal constant UPGRADE_REPO_PERMISSION_ID = keccak256("UPGRADE_REPO_PERMISSION");

    bytes32 internal constant DAO_ETH_NODE = 0x4adec6e9f748b29857b9a275dcb59bd0254a069a7e20cab4ec591499254f119a;
    bytes32 internal constant ETH_LABEL = keccak256("eth");
    bytes32 internal constant DAO_LABEL = keccak256("dao");

    DAOMock internal managingDao;
    ENSRegistry internal ens;
    MockResolver internal resolver;
    ENSSubdomainRegistrar internal subdomainRegistrar;
    PluginRepoRegistry internal pluginRepoRegistry;
    PluginRepoFactory internal factory;

    address internal owner = makeAddr("owner");

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

        PluginRepoRegistry registryImpl = new PluginRepoRegistry();
        pluginRepoRegistry = PluginRepoRegistry(
            address(
                new ERC1967Proxy(
                    address(registryImpl),
                    abi.encodeCall(PluginRepoRegistry.initialize, (IDAO(address(managingDao)), subdomainRegistrar))
                )
            )
        );

        factory = new PluginRepoFactory(pluginRepoRegistry);
    }

    function _deployMockPluginSetup() internal returns (PluginUUPSUpgradeableSetupV1Mock) {
        PluginUUPSUpgradeableV1Mock pluginImpl = new PluginUUPSUpgradeableV1Mock();
        return new PluginUUPSUpgradeableSetupV1Mock(address(pluginImpl));
    }

    /// The factory deploys a UUPS proxy via `ProxyLib.deployUUPSProxy`, which
    /// uses `new ERC1967Proxy(...)`. The first proxy of a session comes from
    /// the factory's nonce 1 (its constructor already used nonce 0 for the
    /// `PluginRepo` base impl). Track the expected address via
    /// `vm.computeCreateAddress`.
    function _expectedRepoAddress() internal view returns (address) {
        return vm.computeCreateAddress(address(factory), vm.getNonce(address(factory)));
    }

    // -------------------------------------------------------------------------
    // ERC-165
    // -------------------------------------------------------------------------

    function test_supportsInterface_returnsFalseForEmptyInterface() public view {
        assertFalse(factory.supportsInterface(0xffffffff));
    }

    function test_supportsInterface_IERC165() public view {
        assertTrue(factory.supportsInterface(type(IERC165).interfaceId));
    }

    function test_supportsInterface_IProtocolVersion() public view {
        assertTrue(factory.supportsInterface(type(IProtocolVersion).interfaceId));
    }

    // -------------------------------------------------------------------------
    // Protocol version
    // -------------------------------------------------------------------------

    function test_protocolVersion_returnsCurrent() public view {
        uint8[3] memory v = factory.protocolVersion();
        assertEq(v[0], 1);
        assertEq(v[1], 4);
        assertEq(v[2], 0);
    }

    // -------------------------------------------------------------------------
    // createPluginRepo
    // -------------------------------------------------------------------------

    function test_createPluginRepo_revertsIfFactoryLacksRegisterPermission() public {
        managingDao.setHasPermissionReturnValueMock(false);
        // The factory delegates to `pluginRepoRegistry.registerPluginRepo`,
        // whose `auth(REGISTER_PLUGIN_REPO_PERMISSION_ID)` modifier reverts.
        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector,
                address(managingDao),
                address(pluginRepoRegistry),
                address(factory),
                REGISTER_PLUGIN_REPO_PERMISSION_ID
            )
        );
        factory.createPluginRepo("my-plugin-repo", owner);
    }

    function test_createPluginRepo_createsRepoAndSetsPermissions() public {
        address expected = _expectedRepoAddress();

        vm.recordLogs();
        PluginRepo repo = factory.createPluginRepo("my-plugin-repo", owner);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(address(repo), expected);

        // PluginRepoRegistered emitted by the registry, no VersionCreated from the repo itself.
        bytes32 pluginRepoRegisteredTopic = keccak256("PluginRepoRegistered(string,address)");
        bytes32 versionCreatedTopic = keccak256("VersionCreated(uint8,uint16,address,bytes)");
        bytes32 releaseMetadataTopic = keccak256("ReleaseMetadataUpdated(uint8,bytes)");
        bool sawRegistered;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(pluginRepoRegistry) && logs[i].topics[0] == pluginRepoRegisteredTopic) {
                sawRegistered = true;
            }
            if (logs[i].emitter == address(repo) && logs[i].topics[0] == versionCreatedTopic) {
                revert("VersionCreated unexpectedly emitted");
            }
            if (logs[i].emitter == address(repo) && logs[i].topics[0] == releaseMetadataTopic) {
                revert("ReleaseMetadataUpdated unexpectedly emitted");
            }
        }
        assertTrue(sawRegistered, "PluginRepoRegistered not emitted");

        // The owner holds MAINTAINER / UPGRADE_REPO / ROOT; the factory does not.
        assertTrue(repo.isGranted(address(repo), owner, MAINTAINER_PERMISSION_ID, ""));
        assertTrue(repo.isGranted(address(repo), owner, UPGRADE_REPO_PERMISSION_ID, ""));
        assertTrue(repo.isGranted(address(repo), owner, ROOT_PERMISSION_ID, ""));
        assertFalse(repo.isGranted(address(repo), address(factory), MAINTAINER_PERMISSION_ID, ""));
        assertFalse(repo.isGranted(address(repo), address(factory), UPGRADE_REPO_PERMISSION_ID, ""));
        assertFalse(repo.isGranted(address(repo), address(factory), ROOT_PERMISSION_ID, ""));
    }

    // -------------------------------------------------------------------------
    // createPluginRepoWithFirstVersion
    // -------------------------------------------------------------------------

    function test_createPluginRepoWithFirstVersion_revertsIfFactoryLacksRegisterPermission() public {
        managingDao.setHasPermissionReturnValueMock(false);

        PluginUUPSUpgradeableSetupV1Mock setup = _deployMockPluginSetup();
        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector,
                address(managingDao),
                address(pluginRepoRegistry),
                address(factory),
                REGISTER_PLUGIN_REPO_PERMISSION_ID
            )
        );
        factory.createPluginRepoWithFirstVersion("my-plugin-repo", address(setup), owner, hex"11", hex"11");
    }

    function test_createPluginRepoWithFirstVersion_publishesV1_1AndTransfersPermissions() public {
        PluginUUPSUpgradeableSetupV1Mock setup = _deployMockPluginSetup();
        address expected = _expectedRepoAddress();

        vm.recordLogs();
        PluginRepo repo =
            factory.createPluginRepoWithFirstVersion("my-plugin-repo", address(setup), owner, hex"11", hex"11");
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(address(repo), expected);

        bytes32 pluginRepoRegisteredTopic = keccak256("PluginRepoRegistered(string,address)");
        bytes32 versionCreatedTopic = keccak256("VersionCreated(uint8,uint16,address,bytes)");
        bytes32 releaseMetadataTopic = keccak256("ReleaseMetadataUpdated(uint8,bytes)");
        bool sawRegistered;
        bool sawVersion;
        bool sawRelease;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(pluginRepoRegistry) && logs[i].topics[0] == pluginRepoRegisteredTopic) {
                sawRegistered = true;
            }
            if (logs[i].emitter == address(repo) && logs[i].topics[0] == versionCreatedTopic) {
                sawVersion = true;
            }
            if (logs[i].emitter == address(repo) && logs[i].topics[0] == releaseMetadataTopic) {
                sawRelease = true;
            }
        }
        assertTrue(sawRegistered, "PluginRepoRegistered not emitted");
        assertTrue(sawVersion, "VersionCreated not emitted");
        assertTrue(sawRelease, "ReleaseMetadataUpdated not emitted");

        // Build 1 of release 1 is the V1.1 version published by the factory.
        PluginRepo.Version memory v = repo.getLatestVersion(uint8(1));
        assertEq(v.tag.release, 1);
        assertEq(v.tag.build, 1);
        assertEq(v.pluginSetup, address(setup));

        // The maintainer holds all three permissions, the factory holds none.
        assertTrue(repo.isGranted(address(repo), owner, MAINTAINER_PERMISSION_ID, ""));
        assertTrue(repo.isGranted(address(repo), owner, UPGRADE_REPO_PERMISSION_ID, ""));
        assertTrue(repo.isGranted(address(repo), owner, ROOT_PERMISSION_ID, ""));
        assertFalse(repo.isGranted(address(repo), address(factory), MAINTAINER_PERMISSION_ID, ""));
        assertFalse(repo.isGranted(address(repo), address(factory), UPGRADE_REPO_PERMISSION_ID, ""));
        assertFalse(repo.isGranted(address(repo), address(factory), ROOT_PERMISSION_ID, ""));
    }

    // -------------------------------------------------------------------------
    // Constructor surface
    // -------------------------------------------------------------------------

    function test_constructor_storesRegistry() public view {
        assertEq(address(factory.pluginRepoRegistry()), address(pluginRepoRegistry));
    }

    function test_constructor_deploysFreshPluginRepoBase() public view {
        // `pluginRepoBase` is set in the constructor and should be a deployed contract.
        address base = factory.pluginRepoBase();
        assertTrue(base != address(0));
        assertTrue(base.code.length > 0);
    }
}
