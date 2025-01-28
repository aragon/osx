// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/PublicResolver.sol";

import {Helper} from "./Helper.sol";

import {DAO} from "../src/core/dao/DAO.sol";
import {DAOFactory} from "../src/framework/dao/DAOFactory.sol";
import {DAORegistry} from "../src/framework/dao/DAORegistry.sol";
import {PluginRepoFactory} from "../src/framework/plugin/repo/PluginRepoFactory.sol";
import {PluginRepoRegistry} from "../src/framework/plugin/repo/PluginRepoRegistry.sol";
import {ENSSubdomainRegistrar} from "../src/framework/utils/ens/ENSSubdomainRegistrar.sol";
import {PluginSetupProcessor} from "../src/framework/plugin/setup/PluginSetupProcessor.sol";
import {PluginSetupRef, hashHelpers} from "../src/framework/plugin/setup/PluginSetupProcessorHelpers.sol";
import {IPluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/IPluginSetup.sol";
import {PluginRepo} from "../src/framework/plugin/repo/PluginRepo.sol";

import {DeployFrameworkFactory} from "../src/DeploymentFrameworkFactory.sol";
import {DaoAuthorizable} from "@aragon/osx-commons-contracts/src/permission/auth/DaoAuthorizable.sol";
import {PlaceholderSetup} from "../src/framework/plugin/repo/placeholder/PlaceholderSetup.sol";

contract FactoryDeploy is Script, Helper {
    uint256 internal deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    string internal network = vm.envString("NETWORK_NAME");
    address internal deployer = vm.addr(deployerPrivateKey);

    bool internal useENSForPlugin = vm.envBool("USE_ENS_FOR_PLUGIN");
    bool internal useENSForDAO = vm.envBool("USE_ENS_FOR_DAO");
    string internal managementDaoSubdomain = vm.envString("MANAGEMENT_DAO_SUBDOMAIN");

    address internal deploymentFrameworkFactoryAddr =
        vm.envOr("DEPLOYMENT_FRAMEWORK_FACTORY", address(0));

    address public ensRegistry;
    address public ensResolver;
    bytes32 public daoNode;
    bytes32 public pluginNode;

    function setUp() public {}

    function run() external {
        vm.startBroadcast(deployerPrivateKey);

        address setup = address(new PlaceholderSetup());

        if (!useENSForDAO && !subdomainNull(managementDaoSubdomain)) {
            revert("Management dao Subdomain can not be non-empty if ens is not requested");
        }

        // If either is true, then:
        //   a. if ens registry address not found inside scripts/getter.ts, deploy it.
        //   b. if ens registry found, use it. Deployer must be the owner of the domains.
        uint256 g1 = gasleft();
        if (useENSForDAO || useENSForPlugin) {
            // 1. Makes a request to osx-commons-sdk.
            // 2. If the `network` is added in `exceptionalDomains`
            // inside `osx-commons`, it uses those domains. If not,
            // It uses `dao.eth` and `plugin.dao.eth`.
            (string memory daoDomain, string memory pluginDomain) = _getDomains(network);

            (ensRegistry, ensResolver) = _getENSRegistry(network);

            if (ensRegistry == address(0)) {
                ensRegistry = address(new ENSRegistry());

                ensResolver = address(
                    new PublicResolver(ENS(address(ensRegistry)), INameWrapper(address(0)))
                );

                // We only need to setup in case of new ens deployment.
                // If already existing, deployer must already be owning the domain.
                if (useENSForDAO) _setupENS(daoDomain);
                if (useENSForPlugin) _setupENS(pluginDomain);
            }

            // In the factory, we use daoNode and pluginNode comparison with bytes32(0)
            // To determine whether ENS must be used or not, hence below 2 lines.
            if (useENSForDAO) daoNode = _getDomainHash(daoDomain);
            if (useENSForPlugin) pluginNode = _getDomainHash(pluginDomain);

            // Sanity check to make sure deployer owns the domain
            // at this step As it's crucial for the next steps.
            require(
                ENSRegistry(ensRegistry).owner(daoNode) == deployer,
                "dao node domain is not owned by the private key provided in .env"
            );

            require(
                ENSRegistry(ensRegistry).owner(pluginNode) == deployer,
                "plugin node domain is not owned by the private key provided in .env"
            );
        }
        uint256 g2 = gasleft();

        // If address found it .env, use it, otherwise deploy it.
        DeployFrameworkFactory factory = deploymentFrameworkFactoryAddr == address(0)
            ? new DeployFrameworkFactory(ensRegistry, ensResolver, daoNode, pluginNode)
            : DeployFrameworkFactory(deploymentFrameworkFactoryAddr);

        uint256 g4 = gasleft();

        // Factory must become a temporary approved operator so that
        // 1. It can register managing dao on the daoRegistry.
        // 2. make the managing dao as the owner.
        if (useENSForDAO || useENSForPlugin) {
            ENS(ensRegistry).setApprovalForAll(address(factory), true); // TODO: shall we call it again to set it to false in the end ?
        }

        // deploy the managing dao metadata to ipfs. (uses pinata)
        bytes memory ipfsCid = _uploadToIPFS();

        uint256 g5 = gasleft();

        // The final function that deploys the whole framework(excluding plugin repos)
        DeployFrameworkFactory.Deployments memory deps = factory.deployFramework(
            deployer,
            DeployFrameworkFactory.DAOSettings({
                metadata: ipfsCid,
                trustedForwarder: address(0),
                daoURI: ""
            }),
            managementDaoSubdomain,
            _getDaoPermissions(),
            DeployFrameworkFactory.Bytecodes({
                daoFactory: type(DAOFactory).creationCode,
                pluginRepoFactory: type(PluginRepoFactory).creationCode,
                psp: type(PluginSetupProcessor).creationCode
            })
        );

        uint256 g6 = gasleft();
        console.log("ENS Deployment cost: ", g1 - g2);
        console.log("Factory deployment cost: ", g2 - g4);
        console.log("deployFramework function cost: ", g5 - g6);

        validateDeployment(address(factory), deployer, deps);

        address[] memory addresses = new address[](16);
        addresses[0] = factory.daoRegistryBase();
        addresses[1] = factory.pluginRepoRegistryBase();
        addresses[2] = factory.ensSubdomainRegistrarBase();
        addresses[3] = factory.ensSubdomainRegistrarBase();
        addresses[4] = factory.daoBase();
        addresses[5] = deps.dao;
        addresses[6] = deps.daoEnsRegistrar;
        addresses[7] = deps.pluginEnsRegistrar;
        addresses[8] = deps.daoRegistry;
        addresses[9] = deps.pluginRepoRegistry;
        addresses[10] = deps.psp;
        addresses[11] = deps.daoFactory;
        addresses[12] = deps.pluginRepoFactory;
        addresses[13] = setup;
        addresses[14] = ensRegistry;
        addresses[15] = ensResolver;

        // store this in a temp file just in case
        // `_storeDeploymentJSON` fails, so we can recover.
        vm.writeJson(vm.toString(abi.encode(addresses)), "./deployed_contracts_temp.json");

        _storeDeploymentJSON(block.chainid, addresses);

        vm.stopBroadcast();
    }

    function _setupENS(string memory _domain) private {
        if (ENSRegistry(ensRegistry).resolver(_getDomainHash(_domain)) == address(ensResolver)) {
            // skip if already registered
            return;
        }

        // check reverse
        (
            string[] memory domainNamesReversed,
            string[] memory domainSubdomains
        ) = _getDomainNameReversedAndSubdomains(_domain);

        for (uint256 j = 0; j < domainNamesReversed.length - 1; j++) {
            string memory domain = domainSubdomains[j];

            // skip if already set
            string memory domainWithSubdomain = string.concat(
                domainNamesReversed[j + 1],
                bytes(domain).length > 0 ? string.concat(".", domain) : ""
            );

            if (
                ENSRegistry(ensRegistry).resolver(_getDomainHash(domainWithSubdomain)) != address(0)
            ) {
                continue;
            }

            // set subnode
            ENSRegistry(ensRegistry).setSubnodeRecord(
                _getDomainHash(domain),
                _getLabelHash(domainNamesReversed[j + 1]),
                deployer,
                address(ensResolver),
                0
            );
        }
    }

    function validateDeployment(
        address _factory,
        address _frameworkOwner,
        DeployFrameworkFactory.Deployments memory _deps
    ) private {
        DAO _dao = DAO(payable(_deps.dao));

        bytes32[] memory daoPermissions = _getDaoPermissions();
        bytes32[] memory frameworkPermissions = _getFrameworkPermissions();

        uint256 count = daoPermissions.length;

        for (uint256 i = 0; i < count; i++) {
            assertPermission(_dao, _deps.dao, _deps.dao, daoPermissions[i], true);
        }

        // 1. Validate ens related settings after deployment.
        // ==========================================================================
        _validateENS(useENSForDAO, _deps.dao, _deps.daoEnsRegistrar, _deps.daoRegistry, daoNode);
        _validateENS(
            useENSForPlugin,
            _deps.dao,
            _deps.pluginEnsRegistrar,
            _deps.pluginRepoRegistry,
            pluginNode
        );

        // 2. Validate other framework permissions.
        // ==========================================================================
        // dao must have `UPGRADE_REGISTRY_PERMISSION` on registries
        assertPermission(_dao, _deps.daoRegistry, _deps.dao, frameworkPermissions[2], true);
        assertPermission(_dao, _deps.pluginRepoRegistry, _deps.dao, frameworkPermissions[2], true);

        // daofactory must have `REGISTER_DAO_PERMISSION` on daoregistry.
        assertPermission(_dao, _deps.daoRegistry, _deps.daoFactory, frameworkPermissions[3], true);

        // our deployment factory must NOT have `REGISTER_DAO_PERMISSION`.
        // During the deployment, it gets this permission to register
        // managing dao, so we check that it was revoked correctly.
        assertPermission(_dao, _deps.daoRegistry, _factory, frameworkPermissions[3], false);

        // pluginrepofactory must have `REGISTER_PLUGIN_REPO_PERMISSION` on pluginRepoRegistry
        assertPermission(
            _dao,
            _deps.pluginRepoRegistry,
            _deps.pluginRepoFactory,
            frameworkPermissions[4],
            true
        );

        // deployer must have `EXECUTE_PERMISSION` on the dao.
        assertPermission(_dao, _deps.dao, _frameworkOwner, frameworkPermissions[5], true);

        // 3. Check that managing dao address is correctly set on the framework contracts.
        // ==========================================================================
        vm.assertEq(address(DaoAuthorizable(_deps.daoRegistry).dao()), _deps.dao);
        vm.assertEq(address(DaoAuthorizable(_deps.pluginRepoRegistry).dao()), _deps.dao);

        vm.assertEq(
            address(PluginRepoFactory(_deps.pluginRepoFactory).pluginRepoRegistry()),
            _deps.pluginRepoRegistry
        );

        vm.assertEq(
            address(PluginSetupProcessor(_deps.psp).repoRegistry()),
            _deps.pluginRepoRegistry
        );

        vm.assertEq(address(DAOFactory(_deps.daoFactory).daoRegistry()), _deps.daoRegistry);
        vm.assertEq(address(DAOFactory(_deps.daoFactory).pluginSetupProcessor()), _deps.psp);

        // TODO: GIORGI check if metadata was set correctly on managing dao.
        // will need to check this in events..
    }

    function _validateENS(
        bool ensSet,
        address _dao,
        address _registrar,
        address _registry,
        bytes32 _node
    ) private {
        bytes32[] memory frameworkPermissions = _getFrameworkPermissions();
        DAO dao_ = DAO(payable(_dao));

        if (!ensSet) {
            vm.assertEq(_registrar, address(0));
            vm.assertEq(address(DAORegistry(_registry).subdomainRegistrar()), address(0));
        } else {
            vm.assertNotEq(_registrar, address(0));

            // registry must have `REGISTER_ENS_SUBDOMAIN_PERMISSION` on registrar
            assertPermission(dao_, _registrar, _registry, frameworkPermissions[0], true);

            // dao must have `UPGRADE_REGISTRAR_PERMISSION` on registrar
            assertPermission(dao_, _registrar, _dao, frameworkPermissions[1], true);

            vm.assertEq(address(DaoAuthorizable(_registrar).dao()), _dao);
            vm.assertEq(ENSSubdomainRegistrar(_registrar).node(), _node);
            vm.assertTrue(ENSRegistry(ensRegistry).isApprovedForAll(_dao, _registrar));
            vm.assertEq(address(DAORegistry(_registry).subdomainRegistrar()), _registrar);
        }
    }

    function subdomainNull(string memory _subdomain) private pure returns (bool) {
        return keccak256(abi.encodePacked(_subdomain)) == keccak256(abi.encodePacked(""));
    }

    function assertPermission(
        DAO _dao,
        address _where,
        address _who,
        bytes32 permissionId,
        bool status
    ) private view {
        bool has = _dao.hasPermission(_where, _who, permissionId, bytes(""));
        status ? vm.assertTrue(has) : vm.assertFalse(has);
    }
}
