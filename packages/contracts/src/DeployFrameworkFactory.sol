// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

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

    constructor(address _ensRegistry, address _ensResolver) {
        ensRegistry = _ensRegistry;
        ensResolver = _ensResolver;

        daoBase = address(new DAO());
        ensSubdomainRegistrarBase = address(new ENSSubdomainRegistrar());
        daoRegistryBase = address(new DAORegistry());
        pluginRepoRegistryBase = address(new PluginRepoRegistry());
    }

    function deployFramework(
        DAOSettings calldata _daoSettings,
        bytes32 daoNode,
        bytes32 pluginNode,
        bytes32[] memory daoPermissionIds,
        Bytecodes memory bytecodes
    ) external {
        uint g1 = gasleft();
        address dao = daoBase.deployUUPSProxy(
            abi.encodeCall(
                DAO.initialize,
                (
                    _daoSettings.metadata,
                    address(this),
                    _daoSettings.trustedForwarder,
                    _daoSettings.daoURI
                )
            )
        );

        address daoEnsSubdomainRegistrar = ensSubdomainRegistrarBase.deployUUPSProxy(
            abi.encodeCall(ENSSubdomainRegistrar.initialize, (IDAO(dao), ENS(ensRegistry), daoNode))
        );

        address pluginEnsSubdomainRegistrar = ensSubdomainRegistrarBase.deployUUPSProxy(
            abi.encodeCall(
                ENSSubdomainRegistrar.initialize,
                (IDAO(dao), ENS(ensRegistry), pluginNode)
            )
        );

        address daoRegistry = daoRegistryBase.deployUUPSProxy(
            abi.encodeCall(
                DAORegistry.initialize,
                (IDAO(dao), ENSSubdomainRegistrar(daoEnsSubdomainRegistrar))
            )
        );

        address pluginRepoRegistry = pluginRepoRegistryBase.deployUUPSProxy(
            abi.encodeCall(
                PluginRepoRegistry.initialize,
                (IDAO(dao), ENSSubdomainRegistrar(pluginEnsSubdomainRegistrar))
            )
        );

        // Deploy PSP
        bytecodes.psp = abi.encodePacked(bytecodes.psp, abi.encode(pluginRepoRegistry));
        address psp = deployWithBytecode(bytecodes.psp);

        // Deploy PluginRepoFactory
        bytecodes.pluginRepoFactory = abi.encodePacked(
            bytecodes.pluginRepoFactory,
            abi.encode(pluginRepoRegistry)
        );
        address pluginRepoFactory = deployWithBytecode(bytecodes.pluginRepoFactory);

        // Deploy DAOFactory
        bytecodes.daoFactory = abi.encodePacked(bytecodes.daoFactory, abi.encode(daoRegistry, psp));
        address daoFactory = deployWithBytecode(bytecodes.daoFactory);

        // console.logAddress(pluginRepoRegistry);
        // console.log("gio");
        // console.logAddress(address(PluginRepoFactory(pluginRepoFactory).pluginRepoRegistry()));

        PermissionLib.MultiTargetPermission[]
            memory items = new PermissionLib.MultiTargetPermission[](daoPermissionIds.length);

        for (uint256 i = 0; i < daoPermissionIds.length; i++) {
            items[i] = PermissionLib.MultiTargetPermission({
                operation: PermissionLib.Operation.Grant,
                where: dao,
                who: dao,
                condition: PermissionLib.NO_CONDITION,
                permissionId: daoPermissionIds[i]
            });
        }

        DAO(payable(dao)).applyMultiTargetPermissions(items);
        uint g2 = gasleft();
        console.log(g1 - g2);
    }

    function deployWithBytecode(bytes memory _bytecode) private returns (address addr) {
        assembly {
            addr := create(0, add(_bytecode, 0x20), mload(_bytecode))
        }
    }
}
