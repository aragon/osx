// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {ENSRegistry} from "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {PluginRepoRegistry} from "../../../../src/framework/plugin/repo/PluginRepoRegistry.sol";
import {IPluginRepo} from "../../../../src/framework/plugin/repo/IPluginRepo.sol";
import {ENSSubdomainRegistrar} from "../../../../src/framework/utils/ens/ENSSubdomainRegistrar.sol";
import {InterfaceBasedRegistry} from "../../../../src/framework/utils/InterfaceBasedRegistry.sol";
import {IDAO} from "../../../../src/common/dao/IDAO.sol";
import {DaoUnauthorized} from "../../../../src/common/permission/auth/auth.sol";
import {DAOMock} from "../../../mocks/commons/dao/DAOMock.sol";
import {MockResolver} from "../../member/mocks/MockResolver.sol";

/// @dev A contract that ERC-165-claims `IPluginRepo`. Stand-in for the real
/// `PluginRepo` (which we'll exercise in its own component test).
contract IPluginRepoStub {
    function supportsInterface(bytes4 _interfaceId) external pure returns (bool) {
        return _interfaceId == type(IPluginRepo).interfaceId || _interfaceId == type(IERC165).interfaceId;
    }
}

/// @notice Direct tests for `PluginRepoRegistry` in
/// `src/framework/plugin/repo/PluginRepoRegistry.sol`.
///
/// Ports `packages/contracts/test/framework/plugin/plugin-repo-registry.ts`
/// (393 lines, 13 cases). Uses the real `ENSRegistry` from `lib/ens-contracts`
/// plus the real `ENSSubdomainRegistrar` (proxied) so the full ENS path is
/// exercised end-to-end. `IPluginRepoStub` stands in for `PluginRepo` (its
/// own component test owns the full PluginRepo surface). The exhaustive ASCII
/// validation loop is owned by `RegistryUtils.t.sol`; only one spot-check
/// invalid-character case is included here.
contract PluginRepoRegistryTest is Test {
    bytes32 internal constant REGISTER_PLUGIN_REPO_PERMISSION_ID = keccak256("REGISTER_PLUGIN_REPO_PERMISSION");

    // namehash("dao.eth"), namehash("my-plugin-repo.dao.eth")
    bytes32 internal constant DAO_ETH_NODE = 0x4adec6e9f748b29857b9a275dcb59bd0254a069a7e20cab4ec591499254f119a;
    bytes32 internal constant ETH_LABEL = keccak256("eth");
    bytes32 internal constant DAO_LABEL = keccak256("dao");
    bytes32 internal constant MY_PLUGIN_REPO_LABEL = keccak256("my-plugin-repo");

    DAOMock internal managingDao;
    ENSRegistry internal ens;
    MockResolver internal resolver;
    ENSSubdomainRegistrar internal subdomainRegistrar;
    PluginRepoRegistry internal pluginRepoRegistry;
    IPluginRepoStub internal repo;

    address internal alice = makeAddr("alice");

    function setUp() public {
        managingDao = new DAOMock();
        managingDao.setHasPermissionReturnValueMock(true);

        ens = new ENSRegistry();
        resolver = new MockResolver(ENS(address(ens)));

        // Build out "dao.eth" in ENS: root -> "eth" -> "dao". The test contract
        // owns each successive subdomain; ENSRegistry's `setSubnodeRecord`
        // requires caller ownership of the parent at each step.
        ens.setSubnodeRecord(bytes32(0), ETH_LABEL, address(this), address(resolver), 0);
        ens.setSubnodeRecord(
            keccak256(abi.encodePacked(bytes32(0), ETH_LABEL)), DAO_LABEL, address(this), address(resolver), 0
        );

        // Deploy the ENSSubdomainRegistrar behind a proxy, then transfer
        // ownership of "dao.eth" to it so it can write subnodes.
        ENSSubdomainRegistrar registrarImpl = new ENSSubdomainRegistrar();
        subdomainRegistrar = ENSSubdomainRegistrar(address(new ERC1967Proxy(address(registrarImpl), "")));
        ens.setOwner(DAO_ETH_NODE, address(subdomainRegistrar));
        subdomainRegistrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), DAO_ETH_NODE);

        // Deploy the PluginRepoRegistry behind a proxy, initialized with the
        // ENS subdomain registrar above.
        PluginRepoRegistry registryImpl = new PluginRepoRegistry();
        pluginRepoRegistry = PluginRepoRegistry(
            address(
                new ERC1967Proxy(
                    address(registryImpl),
                    abi.encodeCall(PluginRepoRegistry.initialize, (IDAO(address(managingDao)), subdomainRegistrar))
                )
            )
        );

        repo = new IPluginRepoStub();
    }

    // -------------------------------------------------------------------------
    // Init / view state
    // -------------------------------------------------------------------------

    function test_subdomainRegistrar_storedAtInit() public view {
        assertEq(address(pluginRepoRegistry.subdomainRegistrar()), address(subdomainRegistrar));
    }

    function test_targetInterfaceId_isIPluginRepo() public view {
        assertEq(pluginRepoRegistry.targetInterfaceId(), type(IPluginRepo).interfaceId);
    }

    // -------------------------------------------------------------------------
    // registerPluginRepo — happy paths
    // -------------------------------------------------------------------------

    function test_register_succeedsAndEmits() public {
        vm.recordLogs();
        pluginRepoRegistry.registerPluginRepo("my-plugin-repo", address(repo));
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 expectedTopic = keccak256("PluginRepoRegistered(string,address)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(pluginRepoRegistry) && logs[i].topics[0] == expectedTopic) {
                (string memory subdomain, address pluginRepo) = abi.decode(logs[i].data, (string, address));
                assertEq(subdomain, "my-plugin-repo");
                assertEq(pluginRepo, address(repo));
                found = true;
                break;
            }
        }
        assertTrue(found, "PluginRepoRegistered not emitted");
        assertTrue(pluginRepoRegistry.entries(address(repo)));
    }

    function test_register_succeedsWithEmptySubdomain() public {
        // Empty subdomain bypasses the ENS path entirely; the registry just
        // records the entry without touching the subdomain registrar.
        pluginRepoRegistry.registerPluginRepo("", address(repo));
        assertTrue(pluginRepoRegistry.entries(address(repo)));
    }

    // -------------------------------------------------------------------------
    // registerPluginRepo — revert paths
    // -------------------------------------------------------------------------

    function test_register_revertsIfENSNotSupportedButSubdomainGiven() public {
        // Spin up a parallel registry initialized with the zero subdomain
        // registrar address.
        PluginRepoRegistry impl = new PluginRepoRegistry();
        PluginRepoRegistry noEnsRegistry = PluginRepoRegistry(
            address(
                new ERC1967Proxy(
                    address(impl),
                    abi.encodeCall(
                        PluginRepoRegistry.initialize, (IDAO(address(managingDao)), ENSSubdomainRegistrar(address(0)))
                    )
                )
            )
        );

        vm.expectRevert(PluginRepoRegistry.ENSNotSupported.selector);
        noEnsRegistry.registerPluginRepo("some", address(repo));
    }

    function test_register_revertsIfCallerLacksPermission() public {
        managingDao.setHasPermissionReturnValueMock(false);
        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector,
                address(managingDao),
                address(pluginRepoRegistry),
                alice,
                REGISTER_PLUGIN_REPO_PERMISSION_ID
            )
        );
        vm.prank(alice);
        pluginRepoRegistry.registerPluginRepo("my-plugin-repo", address(repo));
    }

    function test_register_revertsIfRepoAlreadyRegistered() public {
        pluginRepoRegistry.registerPluginRepo("repo-1", address(repo));
        vm.expectRevert(
            abi.encodeWithSelector(InterfaceBasedRegistry.ContractAlreadyRegistered.selector, address(repo))
        );
        pluginRepoRegistry.registerPluginRepo("repo-2", address(repo));
    }

    function test_register_revertsIfSubdomainAlreadyTaken() public {
        IPluginRepoStub repo2 = new IPluginRepoStub();
        pluginRepoRegistry.registerPluginRepo("my-plugin-repo", address(repo));

        // Re-registering the same subdomain with a *different* repo address
        // bubbles `AlreadyRegistered` from the ENSSubdomainRegistrar.
        bytes32 subnode = keccak256(abi.encodePacked(DAO_ETH_NODE, MY_PLUGIN_REPO_LABEL));
        vm.expectRevert(
            abi.encodeWithSelector(
                ENSSubdomainRegistrar.AlreadyRegistered.selector, subnode, address(subdomainRegistrar)
            )
        );
        pluginRepoRegistry.registerPluginRepo("my-plugin-repo", address(repo2));
    }

    function test_register_revertsIfSubdomainHasInvalidChar() public {
        // Exhaustive ASCII validation is locked in by `RegistryUtils.t.sol`;
        // here just confirm the wrapper reverts with `InvalidPluginSubdomain`
        // for a representative invalid char.
        string memory bad = "MY-PLUGIN-REPO"; // uppercase invalid
        vm.expectRevert(abi.encodeWithSelector(PluginRepoRegistry.InvalidPluginSubdomain.selector, bad));
        pluginRepoRegistry.registerPluginRepo(bad, address(repo));
    }

    // -------------------------------------------------------------------------
    // Protocol version
    // -------------------------------------------------------------------------

    function test_protocolVersion_returnsCurrent() public view {
        uint8[3] memory v = pluginRepoRegistry.protocolVersion();
        assertEq(v[0], 1);
        assertEq(v[1], 4);
        assertEq(v[2], 0);
    }
}
