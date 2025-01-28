// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;
import "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import "@ensdomains/ens-contracts/contracts/registry/ENS.sol";

import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {PermissionLib} from "@aragon/osx-commons-contracts/src/permission/PermissionLib.sol";
import {ProxyLib} from "@aragon/osx-commons-contracts/src/utils/deployment/ProxyLib.sol";

import {DAORegistry} from "./framework/dao/DAORegistry.sol";
import {DAO} from "./core/dao/DAO.sol";
import {ENSSubdomainRegistrar} from "./framework/utils/ens/ENSSubdomainRegistrar.sol";
import {PluginRepoRegistry} from "./framework/plugin/repo/PluginRepoRegistry.sol";
import {PluginRepoFactory} from "./framework/plugin/repo/PluginRepoFactory.sol";
import {Action} from "@aragon/osx-commons-contracts/src/executors/IExecutor.sol";
import {PermissionManager} from "./core/permission/PermissionManager.sol";

import "hardhat/console.sol";

/// @title DAOFactory
/// @author Aragon X - 2022-2023
/// @notice This contract is used to create a DAO.
/// @custom:security-contact sirt@aragon.org
contract DeployFrameworkFactory {
    using ProxyLib for address;

    /// Base contracts, deployed within a constructor...
    address public immutable daoBase;
    address public immutable ensSubdomainRegistrarBase;
    address public immutable daoRegistryBase;
    address public immutable pluginRepoRegistryBase;

    /// The ENS Settings...
    address public immutable ensRegistry;
    address public immutable ensResolver;
    bytes32 public immutable daoNode;
    bytes32 public immutable pluginNode;

    address public owner;

    // Framework permissions...
    bytes32 public constant REGISTER_DAO_PERMISSION = keccak256("REGISTER_DAO_PERMISSION");
    bytes32 public constant EXECUTE_PERMISSION = keccak256("EXECUTE_PERMISSION");
    bytes32 public constant UPGRADE_REGISTRY_PERMISSION = keccak256("UPGRADE_REGISTRY_PERMISSION");
    bytes32 public constant REGISTER_PLUGIN_REPO_PERMISSION =
        keccak256("REGISTER_PLUGIN_REPO_PERMISSION");
    bytes32 public constant UPGRADE_REGISTRAR_PERMISSION =
        keccak256("UPGRADE_REGISTRAR_PERMISSION");
    bytes32 public constant REGISTER_ENS_SUBDOMAIN_PERMISSION =
        keccak256("REGISTER_ENS_SUBDOMAIN_PERMISSION");

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
        address _frameworkOwner,
        DAOSettings calldata _daoSettings,
        string calldata _daoSubdomain,
        bytes32[] memory _daoPermissionIds,
        Bytecodes memory _bytecodes
    ) external returns (Deployments memory deps) {
        require(owner == msg.sender, "sender is not an owner");

        deps.dao = deployDAO(_daoSettings);

        if (daoNode != bytes32(0)) {
            deps.daoEnsRegistrar = deployRegistrar(deps.dao, daoNode);
        }

        if (pluginNode != bytes32(0)) {
            deps.pluginEnsRegistrar = deployRegistrar(deps.dao, pluginNode);
        }

        (deps.daoRegistry, deps.pluginRepoRegistry) = deployRegistries(
            deps.dao,
            deps.daoEnsRegistrar,
            deps.pluginEnsRegistrar
        );

        _bytecodes.psp = abi.encodePacked(_bytecodes.psp, abi.encode(deps.pluginRepoRegistry));
        deps.psp = deployWithBytecode(_bytecodes.psp);

        (deps.pluginRepoFactory, deps.daoFactory) = deployFactories(
            deps.pluginRepoRegistry,
            deps.daoRegistry,
            deps.psp,
            _bytecodes
        );

        setPermissions(deps, _daoPermissionIds);

        uint256 actionsCount = 0;
        uint256 count = 0;

        Action memory daoEnsApprovalAction;
        Action memory pluginEnsApprovalAction;

        if (daoNode != bytes32(0)) {
            ENSRegistry(ensRegistry).setOwner(daoNode, deps.dao);
            actionsCount++;
        }

        if (pluginNode != bytes32(0)) {
            ENSRegistry(ensRegistry).setOwner(pluginNode, deps.dao);
            actionsCount++;
        }

        Action[] memory actions = new Action[](actionsCount + 4);

        if (daoNode != bytes32(0)) {
            actions[count++] = Action({
                to: ensRegistry,
                value: 0,
                data: abi.encodeCall(ENSRegistry.setApprovalForAll, (deps.daoEnsRegistrar, true))
            });
        }

        if (pluginNode != bytes32(0)) {
            actions[count++] = Action({
                to: ensRegistry,
                value: 0,
                data: abi.encodeCall(ENSRegistry.setApprovalForAll, (deps.pluginEnsRegistrar, true))
            });
        }

        actions[count++] = Action({
            to: deps.daoRegistry,
            value: 0,
            data: abi.encodeCall(DAORegistry.register, (IDAO(deps.dao), msg.sender, _daoSubdomain))
        });

        actions[count++] = Action({
            to: deps.dao,
            value: 0,
            data: abi.encodeCall(
                PermissionManager.revoke,
                (deps.daoRegistry, deps.dao, REGISTER_DAO_PERMISSION)
            )
        });

        actions[count++] = Action({
            to: deps.dao,
            value: 0,
            data: abi.encodeCall(
                PermissionManager.revoke,
                (deps.dao, address(this), EXECUTE_PERMISSION)
            )
        });

        actions[count++] = Action({
            to: deps.dao,
            value: 0,
            data: abi.encodeCall(
                PermissionManager.revoke,
                (deps.dao, address(this), keccak256("ROOT_PERMISSION"))
            )
        });

        DAO(payable(deps.dao)).execute(bytes32(0), actions, 0);

        emit DeploymentResults(deps);
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

    function deployRegistrar(address _dao, bytes32 _node) private returns (address) {
        return
            ensSubdomainRegistrarBase.deployUUPSProxy(
                abi.encodeCall(
                    ENSSubdomainRegistrar.initialize,
                    (IDAO(_dao), ENS(ensRegistry), _node)
                )
            );
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
        uint count = daoPermissionIds.length;
        uint permissionCount = count;

        if (_deps.daoEnsRegistrar != address(0)) {
            permissionCount += 2;
        }

        if (_deps.pluginEnsRegistrar != address(0)) {
            permissionCount += 2;
        }

        PermissionLib.MultiTargetPermission[]
            memory items = new PermissionLib.MultiTargetPermission[](permissionCount + 7);

        for (uint256 i = 0; i < count; i++) {
            items[i] = PermissionLib.MultiTargetPermission({
                operation: PermissionLib.Operation.Grant,
                where: _deps.dao,
                who: _deps.dao,
                condition: PermissionLib.NO_CONDITION,
                permissionId: daoPermissionIds[i]
            });
        }

        if (_deps.daoEnsRegistrar != address(0)) {
            items[count++] = PermissionLib.MultiTargetPermission({
                operation: PermissionLib.Operation.Grant,
                where: _deps.daoEnsRegistrar,
                who: _deps.daoRegistry,
                condition: PermissionLib.NO_CONDITION,
                permissionId: REGISTER_ENS_SUBDOMAIN_PERMISSION
            });

            items[count++] = PermissionLib.MultiTargetPermission({
                operation: PermissionLib.Operation.Grant,
                where: _deps.daoEnsRegistrar,
                who: _deps.dao,
                condition: PermissionLib.NO_CONDITION,
                permissionId: UPGRADE_REGISTRAR_PERMISSION
            });
        }

        if (_deps.pluginEnsRegistrar != address(0)) {
            items[count++] = PermissionLib.MultiTargetPermission({
                operation: PermissionLib.Operation.Grant,
                where: _deps.pluginEnsRegistrar,
                who: _deps.pluginRepoRegistry,
                condition: PermissionLib.NO_CONDITION,
                permissionId: REGISTER_ENS_SUBDOMAIN_PERMISSION
            });

            items[count++] = PermissionLib.MultiTargetPermission({
                operation: PermissionLib.Operation.Grant,
                where: _deps.pluginEnsRegistrar,
                who: _deps.dao,
                condition: PermissionLib.NO_CONDITION,
                permissionId: UPGRADE_REGISTRAR_PERMISSION
            });
        }

        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.daoRegistry,
            who: _deps.daoFactory,
            condition: PermissionLib.NO_CONDITION,
            permissionId: REGISTER_DAO_PERMISSION
        });

        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.daoRegistry,
            who: _deps.dao,
            condition: PermissionLib.NO_CONDITION,
            permissionId: UPGRADE_REGISTRY_PERMISSION
        });

        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.pluginRepoRegistry,
            who: _deps.pluginRepoFactory,
            condition: PermissionLib.NO_CONDITION,
            permissionId: REGISTER_PLUGIN_REPO_PERMISSION
        });

        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.pluginRepoRegistry,
            who: _deps.dao,
            condition: PermissionLib.NO_CONDITION,
            permissionId: UPGRADE_REGISTRY_PERMISSION
        });

        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.dao,
            who: msg.sender,
            condition: PermissionLib.NO_CONDITION,
            permissionId: EXECUTE_PERMISSION
        });

        // These must be revoked in the end of `deployFramework` transaction.
        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.dao,
            who: address(this),
            condition: PermissionLib.NO_CONDITION,
            permissionId: EXECUTE_PERMISSION
        });

        items[count++] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _deps.daoRegistry,
            who: _deps.dao,
            condition: PermissionLib.NO_CONDITION,
            permissionId: REGISTER_DAO_PERMISSION
        });

        DAO(payable(_deps.dao)).applyMultiTargetPermissions(items);
    }
}
