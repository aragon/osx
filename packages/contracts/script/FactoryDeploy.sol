// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

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

import {DeployFrameworkFactory} from "../src/DeploymentFrameworkFactory.sol";

contract blax is Script, Helper {
    using ProxyLib for address;

    uint256 internal deployerPrivateKey = vm.envUint("DEPLOYER_KEY");
    string internal network = vm.envString("NETWORK_NAME");
    address internal deployer = vm.addr(deployerPrivateKey);

    bool internal useENSForPlugin = vm.envBool("USE_ENS_FOR_PLUGIN");
    bool internal useENSForDAO = vm.envBool("USE_ENS_FOR_DAO");
    string internal managementDaoSubdomain = vm.envString("MANAGEMENT_DAO_SUBDOMAIN");

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
            revert("Subdomain can not be non-empty if ens is not requested");
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

        uint256 g3 = gasleft();
        DeployFrameworkFactory factory = new DeployFrameworkFactory(
            ensRegistry,
            ensResolver,
            daoNode,
            pluginNode
        );
        uint256 g4 = gasleft();
        console.log("Factory deployment gas 1: ", g3 - g4);

        // if (ensRegistry != address(0)) {
        //     ENS(ensRegistry).setOwner(daoNode, address(factory));
        //     ENS(ensRegistry).setOwner(pluginNode, address(factory));
        // }

        // uint256 g1 = gasleft();
        // factory.deployFramework(
        //     DeployFrameworkFactory.DAOSettings({
        //         metadata: bytes("0x"), // todo double check this is correct
        //         trustedForwarder: address(0),
        //         daoURI: "good"
        //     }),
        //     managementDaoSubdomain,
        //     _getDaoPermissions(),
        //     DeployFrameworkFactory.Bytecodes({
        //         daoFactory: type(DAOFactory).creationCode,
        //         pluginRepoFactory: type(PluginRepoFactory).creationCode,
        //         psp: type(PluginSetupProcessor).creationCode
        //     })
        // );
        // uint256 g2 = gasleft();
        // console.log("deployFramework function gas 1: ", g1 - g2);

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
}
