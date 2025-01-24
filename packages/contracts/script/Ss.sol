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

contract Ss is Script, Helper {
    using ProxyLib for address;

    string constant managementDaoSubdomain = "management";

    uint256 internal deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    string internal network = vm.envString("NETWORK_NAME");
    address internal deployer = vm.addr(deployerPrivateKey);

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
        // dao domain and
        // (string memory daoDomain, string memory pluginDomain) = _getDomains(network);

        vm.startBroadcast(deployerPrivateKey);
        uint g1 = gasleft();
        // 1. config ens
        // 1.1 set the domain hash to the nodes
        daoNode = _getDomainHash("oeee.eth");
        pluginNode = _getDomainHash("plugin.oeee.eth");

        // // 1.2 config ens
        (ensRegistry, ensResolver) = _configureENS("oeee.eth", "plugin.oeee.eth");

        // // 2. deploy to pinnata the managing dao metadata
        string memory ipfsCid = _uploadToIPFS();

        // // 3. deploy manging dao
        address managingDao = _deployDAO(
            DAOSettings({
                metadata: bytes(ipfsCid), // todo double check this is correct
                trustedForwarder: address(0),
                daoURI: "good"
            })
        );

        // // 4. deploy the framework
        Deployments memory deps = _deployFramework(
            managingDao,
            Bytecodes({
                daoFactory: type(DAOFactory).creationCode,
                pluginRepoFactory: type(PluginRepoFactory).creationCode,
                psp: type(PluginSetupProcessor).creationCode
            })
        );

        // // 5. set permissions
        _setPermissions(deps, _getDaoPermissions());

        // // 6. final configurations
        _finalConfigurations(deps, managementDaoSubdomain);

        // uint g2 = gasleft();
        // console.log("fuckme");
        // console.log(g1 - g2);
        // // 7. install multisig on the managing dao
        // // todo
        // // ! note: this can not be done at this point because the multisig plugin repo has not been registered yet

        // // 8. check all went good
        // // todo check deployer or other addresses has no longer permissions
        // // todo check the domains owners etc are correct

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
        } else {
            // lable the contracts
            vm.label({account: ensRegistry_, newLabel: "ENSRegistry"});
            vm.label({account: ensResolver_, newLabel: "ENSResolver"});
        }

        // 2. check the user is the owner of the domains
        if (
            ENS(ensRegistry_).owner(_getDomainHash(daoDomain)) != deployer ||
            ENS(ensRegistry_).owner(_getDomainHash(pluginDomain)) != deployer
        ) {
            // note: if it reverts and you bought the domains try unwrapping them
            revert("domains are not owned by deployer");
        }
    }

    function _deployFramework(
        address _managingDao,
        Bytecodes memory bytecodes
    ) private returns (Deployments memory deps) {
        deps.dao = _managingDao;

        console.log("giorgi ffff");
        console.log(ensRegistry);

        // 1. deploy registrars
        (deps.daoEnsRegistrar, deps.pluginEnsRegistrar) = _deployRegistrars(deps.dao);

        // 2. deploy registries
        (deps.daoRegistry, deps.pluginRepoRegistry) = _deployRegistries(
            deps.dao,
            deps.daoEnsRegistrar,
            deps.pluginEnsRegistrar
        );

        // 3. deploy psp
        bytecodes.psp = abi.encodePacked(bytecodes.psp, abi.encode(deps.pluginRepoRegistry));
        deps.psp = _deployWithBytecode(bytecodes.psp);

        // 4. deploy factories
        (deps.pluginRepoFactory, deps.daoFactory) = _deployFactories(
            deps.pluginRepoRegistry,
            deps.daoRegistry,
            deps.psp,
            bytecodes
        );
    }

    function _finalConfigurations(Deployments memory _deps, string memory _daoSubdomain) private {
        // 1. set approval for all
        ENSRegistry(ensRegistry).setApprovalForAll(_deps.daoEnsRegistrar, true);

        // 2. register managing dao
        DAORegistry(_deps.daoRegistry).register(IDAO(_deps.dao), deployer, _daoSubdomain);

        // 3. revoke approval for all
        ENSRegistry(ensRegistry).setApprovalForAll(_deps.daoEnsRegistrar, false);

        // 4. revoke register dao permission for deployer
        DAO(payable(_deps.dao)).revoke(
            _deps.daoRegistry,
            deployer,
            keccak256("REGISTER_DAO_PERMISSION")
        );

        // 5. revoke root permission for deployer
        DAO(payable(_deps.dao)).revoke(_deps.dao, deployer, keccak256("ROOT_PERMISSION"));

        // 6. set the dao as the registry owner
        ENSRegistry(ensRegistry).setOwner(daoNode, _deps.dao);
        ENSRegistry(ensRegistry).setOwner(pluginNode, _deps.dao);

        emit DeploymentResults(_deps);
    }

    // ============================== Deploy Helper Functions ================================

    function _deployDAO(DAOSettings memory _daoSettings) private returns (address dao) {
        bytes memory initData = abi.encodeCall(
            DAO.initialize,
            (_daoSettings.metadata, deployer, _daoSettings.trustedForwarder, _daoSettings.daoURI)
        );

        dao = address(new DAO()).deployUUPSProxy(initData);

        vm.label({account: dao, newLabel: "DAO"});
    }

    function _deployRegistrars(
        address _dao
    ) private returns (address daoEnsRegistrar, address pluginEnsRegistrar) {
        daoEnsRegistrar = address(new ENSSubdomainRegistrar()).deployUUPSProxy(
            abi.encodeCall(
                ENSSubdomainRegistrar.initialize,
                (IDAO(_dao), ENS(ensRegistry), daoNode)
            )
        );

        pluginEnsRegistrar = address(new ENSSubdomainRegistrar()).deployUUPSProxy(
            abi.encodeCall(
                ENSSubdomainRegistrar.initialize,
                (IDAO(_dao), ENS(ensRegistry), pluginNode)
            )
        );

        vm.label({account: daoEnsRegistrar, newLabel: "DAOENSRegistrar"});
        vm.label({account: pluginEnsRegistrar, newLabel: "PluginENSRegistrar"});
    }

    function _deployRegistries(
        address _dao,
        address _daoEnsRegistrar,
        address _pluginEnsRegistrar
    ) private returns (address daoRegistry, address pluginRepoRegistry) {
        daoRegistry = address(new DAORegistry()).deployUUPSProxy(
            abi.encodeCall(
                DAORegistry.initialize,
                (IDAO(_dao), ENSSubdomainRegistrar(_daoEnsRegistrar))
            )
        );

        pluginRepoRegistry = address(new PluginRepoRegistry()).deployUUPSProxy(
            abi.encodeCall(
                PluginRepoRegistry.initialize,
                (IDAO(_dao), ENSSubdomainRegistrar(_pluginEnsRegistrar))
            )
        );

        vm.label({account: daoRegistry, newLabel: "DAORegistry"});
        vm.label({account: pluginRepoRegistry, newLabel: "PluginRepoRegistry"});
    }

    function _deployFactories(
        address _pluginRepoRegistry,
        address _daoRegistry,
        address _psp,
        Bytecodes memory _bytecodes
    ) private returns (address pluginRepoFactory, address daoFactory) {
        pluginRepoFactory = _deployWithBytecode(
            abi.encodePacked(_bytecodes.pluginRepoFactory, abi.encode(_pluginRepoRegistry))
        );

        daoFactory = _deployWithBytecode(
            abi.encodePacked(_bytecodes.daoFactory, abi.encode(_daoRegistry, _psp))
        );

        vm.label({account: pluginRepoFactory, newLabel: "PluginRepoFactory"});
        vm.label({account: daoFactory, newLabel: "DAOFactory"});
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

    // ========================== Other Helpers ===================================

    function _deployWithBytecode(bytes memory _bytecode) private returns (address addr) {
        assembly {
            addr := create(0, add(_bytecode, 0x20), mload(_bytecode))
        }
    }

    function _setPermissions(Deployments memory _deps, bytes32[] memory daoPermissionIds) private {
        PermissionLib.MultiTargetPermission[]
            memory items = new PermissionLib.MultiTargetPermission[](daoPermissionIds.length + 10);

        uint count = daoPermissionIds.length;

        for (uint256 i = 0; i < count; i++) {
            items[i] = PermissionLib.MultiTargetPermission({
                operation: PermissionLib.Operation.Grant,
                where: _deps.dao,
                who: _deps.dao,
                condition: PermissionLib.NO_CONDITION,
                permissionId: daoPermissionIds[i]
            });
        }

        // other needed permissions
        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.daoEnsRegistrar,
            who: _deps.daoRegistry,
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("REGISTER_ENS_SUBDOMAIN_PERMISSION")
        });

        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.pluginEnsRegistrar,
            who: _deps.pluginRepoRegistry,
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("REGISTER_ENS_SUBDOMAIN_PERMISSION")
        });

        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.daoEnsRegistrar,
            who: _deps.dao,
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("UPGRADE_REGISTRAR_PERMISSION")
        });

        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.pluginEnsRegistrar,
            who: _deps.dao,
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("UPGRADE_REGISTRAR_PERMISSION")
        });

        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.daoRegistry,
            who: _deps.daoFactory,
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("REGISTER_DAO_PERMISSION")
        });

        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.daoRegistry,
            who: _deps.dao,
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("UPGRADE_REGISTRY_PERMISSION")
        });

        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.pluginRepoRegistry,
            who: _deps.pluginRepoFactory,
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("REGISTER_PLUGIN_REPO_PERMISSION")
        });

        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.pluginRepoRegistry,
            who: _deps.dao,
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("UPGRADE_REGISTRY_PERMISSION")
        });

        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.dao,
            who: deployer,
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("SET_METADATA_PERMISSION")
        });

        // This must be revoked in the end of `deployFramework` transaction.
        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.daoRegistry,
            who: deployer,
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("REGISTER_DAO_PERMISSION")
        });

        DAO(payable(_deps.dao)).applyMultiTargetPermissions(items);
    }
}
