// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/PublicResolver.sol";

import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {ProxyLib} from "@aragon/osx-commons-contracts/src/utils/deployment/ProxyLib.sol";
import {PermissionLib} from "@aragon/osx-commons-contracts/src/permission/PermissionLib.sol";

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

contract FactoryDeploy is Script, Helper {
    using ProxyLib for address;

    uint256 internal deployerPrivateKey = vm.envUint("DEPLOYER_KEY");
    string internal network = vm.envString("NETWORK_NAME");
    address internal deployer = vm.addr(deployerPrivateKey);

    bool internal useENSForPlugin = vm.envBool("USE_ENS_FOR_PLUGIN");
    bool internal useENSForDAO = vm.envBool("USE_ENS_FOR_DAO");
    string internal managementDaoSubdomain = vm.envString("MANAGEMENT_DAO_SUBDOMAIN");

    address internal PLUGIN_REPO_ADDRESS = vm.addr(vm.envUint("PLUGIN_REPO_ADDRESS"));
    uint256 internal PLUGIN_REPO_RELEASE_NUMBER = vm.envUint("PLUGIN_REPO_RELEASE_NUMBER");
    uint256 internal PLUGIN_REPO_BUILD_NUMBER = vm.envUint("PLUGIN_REPO_BUILD_NUMBER");
    bytes internal PLUGIN_DATA = vm.envBytes("PLUGIN_DATA");

    address public ensRegistry;
    address public ensResolver;
    bytes32 public daoNode;
    bytes32 public pluginNode;

    struct DAOSettings {
        bytes metadata;
        address trustedForwarder;
        string daoURI;
    }

    struct Bytecodes {
        bytes daoFactory;
        bytes pluginRepoFactory;
        bytes psp;
    }

    struct Deployments {
        address dao;
        address daoEnsRegistrar;
        address pluginEnsRegistrar;
        address daoRegistry;
        address pluginRepoRegistry;
        address psp;
        address daoFactory;
        address pluginRepoFactory;
    }

    event DeploymentResults(Deployments deps);

    function setUp() public {}

    function run() external {
        vm.startBroadcast(deployerPrivateKey);

        if (!useENSForDAO && !subdomainNull(managementDaoSubdomain)) {
            revert("Management dao Subdomain can not be non-empty if ens is not requested");
        }

        // If either is true, then:
        //   a. if ens registry not found on a network, deploy it.
        //   b. if ens registry found, use it. Deployer must be the owner of the domains.
        if (useENSForDAO || useENSForPlugin) {
            (ensRegistry, ensResolver) = _getENSRegistry(network);

            if (ensRegistry == address(0)) {
                ensRegistry = address(new ENSRegistry());

                ensResolver = address(
                    new PublicResolver(ENS(address(ensRegistry)), INameWrapper(address(0)))
                );
            }

            (string memory daoDomain, string memory pluginDomain) = ("fdasd.eth", "kk.eth");
            daoNode = _getDomainHash(daoDomain);
            pluginNode = _getDomainHash(pluginDomain);

            if (useENSForDAO) _setupENS(daoDomain);
            if (useENSForPlugin) _setupENS(pluginDomain);
        }

        uint256 g1 = gasleft();

        DeployFrameworkFactory factory = new DeployFrameworkFactory(
            ensRegistry,
            ensResolver,
            daoNode,
            pluginNode
        );

        uint256 g2 = gasleft();

        if (useENSForDAO) {
            ENS(ensRegistry).setOwner(daoNode, address(factory));
        }

        if (useENSForPlugin) {
            ENS(ensRegistry).setOwner(pluginNode, address(factory));
        }

        uint256 g3 = gasleft();

        DeployFrameworkFactory.Deployments memory deps = factory.deployFramework(
            deployer,
            DeployFrameworkFactory.DAOSettings({
                metadata: bytes("0x"), // this needs to be managing-dao-metadata.json's ipfs
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

        uint256 g4 = gasleft();
        console.log("Factory deployment gas 1: ", g1 - g2);
        console.log("deployFramework function gas 1: ", g3 - g4);

        validatePermissions(address(factory), deployer, deps);

        if (PLUGIN_REPO_ADDRESS != address(0)) {
            // Prepare plugin.
            PluginSetupRef memory ref = PluginSetupRef(
                PluginRepo.Tag({
                    release: uint8(PLUGIN_REPO_RELEASE_NUMBER),
                    build: uint16(PLUGIN_REPO_BUILD_NUMBER)
                }),
                PluginRepo(PLUGIN_REPO_ADDRESS)
            );

            DAO(payable(deps.dao)).grant(deps.dao, deps.psp, keccak256("ROOT_PERMISSION"));

            (
                address plugin,
                IPluginSetup.PreparedSetupData memory preparedSetupData
            ) = PluginSetupProcessor(deps.psp).prepareInstallation(
                    deps.dao,
                    PluginSetupProcessor.PrepareInstallationParams(ref, PLUGIN_DATA)
                );

            // Apply plugin.
            PluginSetupProcessor(deps.psp).applyInstallation(
                deps.dao,
                PluginSetupProcessor.ApplyInstallationParams(
                    ref,
                    plugin,
                    preparedSetupData.permissions,
                    hashHelpers(preparedSetupData.helpers)
                )
            );

            DAO(payable(deps.dao)).revoke(deps.dao, deps.psp, keccak256("ROOT_PERMISSION"));
        }

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

    function subdomainNull(string memory _subdomain) private pure returns (bool) {
        return keccak256(abi.encodePacked(_subdomain)) == keccak256(abi.encodePacked(""));
    }

    function validatePermissions(
        address _factory,
        address _frameworkOwner,
        DeployFrameworkFactory.Deployments memory _deps
    ) private {
        bytes32[] memory daoPermissionIds = _getDaoPermissions();
        uint256 count = daoPermissionIds.length;

        for (uint256 i = 0; i < count; i++) {
            bool hasP = DAO(payable(_deps.dao)).hasPermission(
                _deps.dao,
                _deps.dao,
                daoPermissionIds[i],
                bytes("")
            );
            vm.assertTrue(hasP);
        }

        DAO _dao = DAO(payable(_deps.dao));

        if (_deps.daoEnsRegistrar != address(0)) {
            vm.assertTrue(
                _dao.hasPermission(
                    _deps.daoEnsRegistrar,
                    _deps.daoRegistry,
                    keccak256("REGISTER_ENS_SUBDOMAIN_PERMISSION"),
                    bytes("")
                )
            );
        }

        if (_deps.pluginEnsRegistrar != address(0)) {
            vm.assertTrue(
                _dao.hasPermission(
                    _deps.pluginEnsRegistrar,
                    _deps.pluginRepoRegistry,
                    keccak256("REGISTER_ENS_SUBDOMAIN_PERMISSION"),
                    bytes("")
                )
            );
        }

        vm.assertTrue(
            _dao.hasPermission(
                _deps.dao,
                _frameworkOwner,
                keccak256("EXECUTE_PERMISSION"),
                bytes("")
            )
        );

        vm.assertTrue(
            _dao.hasPermission(
                _deps.daoEnsRegistrar,
                _deps.dao,
                keccak256("UPGRADE_REGISTRAR_PERMISSION"),
                bytes("")
            )
        );

        vm.assertTrue(
            _dao.hasPermission(
                _deps.pluginEnsRegistrar,
                _deps.dao,
                keccak256("UPGRADE_REGISTRAR_PERMISSION"),
                bytes("")
            )
        );

        vm.assertTrue(
            _dao.hasPermission(
                _deps.daoRegistry,
                _deps.daoFactory,
                keccak256("REGISTER_DAO_PERMISSION"),
                bytes("")
            )
        );

        vm.assertTrue(
            _dao.hasPermission(
                _deps.daoRegistry,
                _deps.dao,
                keccak256("UPGRADE_REGISTRY_PERMISSION"),
                bytes("")
            )
        );
        vm.assertTrue(
            _dao.hasPermission(
                _deps.pluginRepoRegistry,
                _deps.pluginRepoFactory,
                keccak256("REGISTER_PLUGIN_REPO_PERMISSION"),
                bytes("")
            )
        );

        vm.assertTrue(
            _dao.hasPermission(
                _deps.pluginRepoRegistry,
                _deps.dao,
                keccak256("UPGRADE_REGISTRY_PERMISSION"),
                bytes("")
            )
        );

        vm.assertFalse(
            _dao.hasPermission(
                _deps.daoRegistry,
                _factory,
                keccak256("REGISTER_DAO_PERMISSION"),
                bytes("")
            )
        );

        // Check that managing dao address is correctly set on the framework contracts.
        vm.assertEq(address(DaoAuthorizable(_deps.daoRegistry).dao()), _deps.dao);
        vm.assertEq(address(DaoAuthorizable(_deps.pluginRepoRegistry).dao()), _deps.dao);

        if (useENSForDAO) {
            vm.assertEq(address(DaoAuthorizable(_deps.daoEnsRegistrar).dao()), _deps.dao);
            vm.assertEq(ENSSubdomainRegistrar(_deps.daoEnsRegistrar).node(), daoNode);
            // vm.assertTrue(
            //     ENSRegistry(ensRegistry).isApprovedForAll(_deps.dao, _deps.daoEnsRegistrar)
            // );
            vm.assertEq(
                address(DAORegistry(_deps.daoRegistry).subdomainRegistrar()),
                _deps.daoEnsRegistrar
            );
        } else {
            vm.assertEq(address(DAORegistry(_deps.daoRegistry).subdomainRegistrar()), address(0));
        }

        if (useENSForPlugin) {
            vm.assertEq(address(DaoAuthorizable(_deps.pluginEnsRegistrar).dao()), _deps.dao);
            vm.assertEq(ENSSubdomainRegistrar(_deps.pluginEnsRegistrar).node(), pluginNode);
            // vm.assertTrue(
            //     ENSRegistry(ensRegistry).isApprovedForAll(_deps.dao, _deps.pluginEnsRegistrar)
            // );

            vm.assertEq(
                address(PluginRepoRegistry(_deps.pluginRepoRegistry).subdomainRegistrar()),
                _deps.pluginEnsRegistrar
            );
        } else {
            vm.assertEq(
                address(PluginRepoRegistry(_deps.daoRegistry).subdomainRegistrar()),
                address(0)
            );
        }

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

        // TODO: check if metadata was set correctly on managing dao
        // dao.getMetadata()
    }
}
