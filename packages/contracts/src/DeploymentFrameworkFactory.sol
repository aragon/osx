// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;
import "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";

import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {IProtocolVersion} from "@aragon/osx-commons-contracts/src/utils/versioning/IProtocolVersion.sol";
import {ProtocolVersion} from "@aragon/osx-commons-contracts/src/utils/versioning/ProtocolVersion.sol";
import {IPluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/IPluginSetup.sol";
import {PermissionLib} from "@aragon/osx-commons-contracts/src/permission/PermissionLib.sol";
import {ProxyLib} from "@aragon/osx-commons-contracts/src/utils/deployment/ProxyLib.sol";
import "@ensdomains/ens-contracts/contracts/registry/ENS.sol";

import {DAORegistry} from "./framework/dao/DAORegistry.sol";
import {DAO} from "./core/dao/DAO.sol";
import {ENSSubdomainRegistrar} from "./framework/utils/ens/ENSSubdomainRegistrar.sol";
import {PluginRepoRegistry} from "./framework/plugin/repo/PluginRepoRegistry.sol";
import {PluginRepoFactory} from "./framework/plugin/repo/PluginRepoFactory.sol";

import "hardhat/console.sol";

/// @title DAOFactory
/// @author Aragon X - 2022-2023
/// @notice This contract is used to create a DAO.
/// @custom:security-contact sirt@aragon.org
contract DeployFrameworkFactory {
    using ProxyLib for address;

    address public immutable daoBase;
    address public immutable ensSubdomainRegistrarBase;
    address public immutable daoRegistryBase;
    address public immutable pluginRepoRegistryBase;

    address public immutable ensRegistry;
    address public immutable ensResolver;
    bytes32 public immutable daoNode;
    bytes32 public immutable pluginNode;

    address public owner;

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

    constructor(address _ensRegistry, address _ensResolver, bytes32 _daoNode, bytes32 _pluginNode) {
        ensRegistry = _ensRegistry;
        ensResolver = _ensResolver;
        daoNode = _daoNode;
        pluginNode = _pluginNode;

        owner = msg.sender;

        // Deploy base contracts...
        daoBase = address(new DAO());
        ensSubdomainRegistrarBase = address(new ENSSubdomainRegistrar());
        daoRegistryBase = address(new DAORegistry());
        pluginRepoRegistryBase = address(new PluginRepoRegistry());
    }

    /// @notice This function can only be called one time. This is because if the function succeeds,
    ///         it transfers domains to managing dao, meaning that if called again, it won't be able to set owners again.
    function deployFramework(
        DAOSettings calldata _daoSettings,
        string calldata _daoSubdomain,
        bytes32[] memory daoPermissionIds,
        Bytecodes memory bytecodes
    ) external returns (Deployments memory deps) {
        deps.dao = deployDAO(_daoSettings);

        (deps.daoEnsRegistrar, deps.pluginEnsRegistrar) = deployRegistrars(deps.dao);

        (deps.daoRegistry, deps.pluginRepoRegistry) = deployRegistries(
            deps.dao,
            deps.daoEnsRegistrar,
            deps.pluginEnsRegistrar
        );

        bytecodes.psp = abi.encodePacked(bytecodes.psp, abi.encode(deps.pluginRepoRegistry));
        deps.psp = deployWithBytecode(bytecodes.psp);

        (deps.pluginRepoFactory, deps.daoFactory) = deployFactories(
            deps.pluginRepoRegistry,
            deps.daoRegistry,
            deps.psp,
            bytecodes
        );

        setPermissions(deps, daoPermissionIds);

        if (ensRegistry != address(0)) {
            ENSRegistry(ensRegistry).setApprovalForAll(deps.daoEnsRegistrar, true);
            DAORegistry(deps.daoRegistry).register(IDAO(deps.dao), msg.sender, _daoSubdomain);
            ENSRegistry(ensRegistry).setApprovalForAll(deps.daoEnsRegistrar, false);
        }

        DAO(payable(deps.dao)).revoke(
            deps.daoRegistry,
            address(this),
            keccak256("REGISTER_DAO_PERMISSION")
        );

        // When dao was deployed above, `address(this)` became a ROOT, so we revoke now.
        DAO(payable(deps.dao)).revoke(deps.dao, address(this), keccak256("ROOT_PERMISSION"));

        if (ensRegistry != address(0)) {
            ENSRegistry(ensRegistry).setOwner(daoNode, deps.dao);
            ENSRegistry(ensRegistry).setOwner(pluginNode, deps.dao);
        }

        emit DeploymentResults(deps);
    }

    /// @dev This function can only have effect if in the deploy script(ts file - hardhat-deploy),
    ///      transferring domain to this factory succeeded, but `deployFramework` failed due to some r
    ///      reason(e.x out of gas) or something else after which `deployFramework` can not be called again.
    ///      If such scenario occurs, sender loses the domains completely as this factory contract will be
    ///      the owner, So we allow sender to get the domains back.
    /// @notice This will not have any effect if `deployFramework` succeeded as that function makes
    ///         managing dao as owner.
    function transferDomainsBack() public {
        require(msg.sender == owner, "Sender not an owner");

        if (ENSRegistry(ensRegistry).owner(daoNode) == address(this)) {
            ENSRegistry(ensRegistry).setOwner(daoNode, msg.sender);
        }

        if (ENSRegistry(ensRegistry).owner(pluginNode) == address(this)) {
            ENSRegistry(ensRegistry).setOwner(pluginNode, msg.sender);
        }
    }

    // ============================== Deploy Helper Functions ================================

    function deployDAO(DAOSettings memory _daoSettings) private returns (address) {
        bytes memory initData = abi.encodeCall(
            DAO.initialize,
            (
                _daoSettings.metadata,
                address(this),
                _daoSettings.trustedForwarder,
                _daoSettings.daoURI
            )
        );

        return daoBase.deployUUPSProxy(initData);
    }

    function deployRegistrars(address _dao) private returns (address, address) {
        address daoEnsRegistrar = ensSubdomainRegistrarBase.deployUUPSProxy(
            abi.encodeCall(
                ENSSubdomainRegistrar.initialize,
                (IDAO(_dao), ENS(ensRegistry), daoNode)
            )
        );

        address pluginEnsRegistrar = ensSubdomainRegistrarBase.deployUUPSProxy(
            abi.encodeCall(
                ENSSubdomainRegistrar.initialize,
                (IDAO(_dao), ENS(ensRegistry), pluginNode)
            )
        );

        return (daoEnsRegistrar, pluginEnsRegistrar);
    }

    function deployRegistries(
        address _dao,
        address _daoEnsRegistrar,
        address _pluginEnsRegistrar
    ) private returns (address, address) {
        address daoRegistry = daoRegistryBase.deployUUPSProxy(
            abi.encodeCall(
                DAORegistry.initialize,
                (IDAO(_dao), ENSSubdomainRegistrar(_daoEnsRegistrar))
            )
        );

        address pluginRepoRegistry = pluginRepoRegistryBase.deployUUPSProxy(
            abi.encodeCall(
                PluginRepoRegistry.initialize,
                (IDAO(_dao), ENSSubdomainRegistrar(_pluginEnsRegistrar))
            )
        );

        return (daoRegistry, pluginRepoRegistry);
    }

    function deployFactories(
        address _pluginRepoRegistry,
        address _daoRegistry,
        address _psp,
        Bytecodes memory _bytecodes
    ) private returns (address, address) {
        address pluginRepoFactory = deployWithBytecode(
            abi.encodePacked(_bytecodes.pluginRepoFactory, abi.encode(_pluginRepoRegistry))
        );

        address daoFactory = deployWithBytecode(
            abi.encodePacked(_bytecodes.daoFactory, abi.encode(_daoRegistry, _psp))
        );
        return (pluginRepoFactory, daoFactory);
    }

    // ========================== Other Helpers ===================================

    function deployWithBytecode(bytes memory _bytecode) private returns (address addr) {
        assembly {
            addr := create(0, add(_bytecode, 0x20), mload(_bytecode))
        }
    }

    function setPermissions(Deployments memory _deps, bytes32[] memory daoPermissionIds) private {
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
            who: msg.sender,
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("SET_METADATA_PERMISSION")
        });

        // This must be revoked in the end of `deployFramework` transaction.
        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.daoRegistry,
            who: address(this),
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("REGISTER_DAO_PERMISSION")
        });

        DAO(payable(_deps.dao)).applyMultiTargetPermissions(items);
    }
}
