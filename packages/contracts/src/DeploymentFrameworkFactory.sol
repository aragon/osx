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

    constructor(address _ensRegistry, address _ensResolver, bytes32 _daoNode, bytes32 _pluginNode) {
        // ensRegistry = _ensRegistry;
        // ensResolver = _ensResolver;
        // daoNode = _daoNode;
        // pluginNode = _pluginNode;

        // owner = msg.sender;

        // Deploy base contracts...
        address daoBase = address(new DAO());

        bytes memory initData = abi.encodeCall(
            DAO.initialize,
            (bytes(""), address(this), address(0), "great")
        );

        daoBase.deployUUPSProxy(initData);
        // ensSubdomainRegistrarBase = address(new ENSSubdomainRegistrar());
        // daoRegistryBase = address(new DAORegistry());
        // pluginRepoRegistryBase = address(new PluginRepoRegistry());
    }
}
