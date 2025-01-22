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

    bool internal useENS = vm.envBool("USE_ENS");
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

        if (useENS) {
            if (
                keccak256(abi.encodePacked(managementDaoSubdomain)) ==
                keccak256(abi.encodePacked(""))
            ) {
                revert("provide dao subdomain");
            }

            (string memory daoDomain, string memory pluginDomain) = ("ss.eth", "oe.blax.eth");

            (ensRegistry, ensResolver) = _configureENS(daoDomain, pluginDomain);

            daoNode = _getDomainHash(daoDomain);
            pluginNode = _getDomainHash(pluginDomain);
        }

        DeployFrameworkFactory factory = new DeployFrameworkFactory(
            ensRegistry,
            ensResolver,
            daoNode,
            pluginNode
        );
        factory.deployFramework(
            DeployFrameworkFactory.DAOSettings({
                metadata: bytes("0x"), // todo double check this is correct
                trustedForwarder: address(0),
                daoURI: "good"
            }),
            managementDaoSubdomain,
            _getDaoPermissions(),
            DeployFrameworkFactory.Bytecodes({
                daoFactory: type(DAOFactory).creationCode,
                pluginRepoFactory: type(PluginRepoFactory).creationCode,
                psp: type(PluginSetupProcessor).creationCode
            })
        );

        vm.stopBroadcast();
    }

    function _configureENS(
        string memory daoDomain,
        string memory pluginDomain
    ) private returns (address ensRegistry_, address ensResolver_) {
        // 1. get the ens registry address
        (ensRegistry_, ensResolver_) = _getENSRegistry(network);

        // if there is not official ens registry address, deploy it
        if (ensRegistry_ == address(0)) {
            // setup ens (deploy ens registry, ens resolver, set resolver to ens registry, register domains, ...)
            (ensRegistry_, ensResolver_) = _setupENS(daoDomain, pluginDomain);
        }

        // Check that deployer is the owner of the domains
        if (
            ENS(ensRegistry_).owner(_getDomainHash(daoDomain)) != deployer ||
            ENS(ensRegistry_).owner(_getDomainHash(pluginDomain)) != deployer
        ) {
            // note: if it reverts and you bought the domains try unwrapping them
            revert("domains are not owned by deployer");
        }
    }

    function _setupENS(
        string memory _daoDomain,
        string memory _pluginDomain
    ) private returns (address, address) {
        string[] memory domains = new string[](2);
        domains[0] = _daoDomain;
        domains[1] = _pluginDomain;

        // 1. deploy ens registry
        ENSRegistry ensRegistry_ = new ENSRegistry();

        // 2. deploy ens resolver
        PublicResolver ensResolver_ = new PublicResolver(
            ENS(address(ensRegistry_)),
            INameWrapper(address(0))
        );

        // register domains
        for (uint256 i = 0; i < domains.length; i++) {
            if (ensRegistry_.resolver(_getDomainHash(domains[i])) == address(ensResolver_)) {
                // skip if already registered
                continue;
            }

            // check reverse
            (
                string[] memory domainNamesReversed,
                string[] memory domainSubdomains
            ) = _getDomainNameReversedAndSubdomains(domains[i]);

            for (uint256 j = 0; j < domainNamesReversed.length - 1; j++) {
                string memory domain = domainSubdomains[j];

                // skip if already set
                string memory domainWithSubdomain = string.concat(
                    domainNamesReversed[j + 1],
                    bytes(domain).length > 0 ? string.concat(".", domain) : ""
                );

                if (ensRegistry_.resolver(_getDomainHash(domainWithSubdomain)) != address(0)) {
                    continue;
                }

                // set subnode
                ensRegistry_.setSubnodeRecord(
                    _getDomainHash(domain),
                    _getLabelHash(domainNamesReversed[j + 1]),
                    deployer,
                    address(ensResolver_),
                    0
                );
            }
        }

        vm.label({account: address(ensRegistry_), newLabel: "ENSRegistry"});
        vm.label({account: address(ensResolver_), newLabel: "ENSResolver"});

        return (address(ensRegistry_), address(ensResolver_));
    }
}
