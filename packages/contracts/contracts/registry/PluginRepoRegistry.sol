// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {ENSSubdomainRegistrar} from "./ens/ENSSubdomainRegistrar.sol";
import {IDAO} from "../core/IDAO.sol";
import {InterfaceBasedRegistry} from "./interface-based-registry/InterfaceBasedRegistry.sol";
import {IPluginRepo} from "../plugin/IPluginRepo.sol";

/// @title PluginRepoRegistry
/// @author Aragon Association - 2022
/// @notice This contract maintains an address-based registery of plugin repositories in the Aragon App DAO framework.
contract PluginRepoRegistry is InterfaceBasedRegistry {
    /// @notice The ID of the permission required to call the `register` function.
    bytes32 public constant PLUGIN_REGISTER_PERMISSION_ID = keccak256("PLUGIN_REGISTER_PERMISSION");

    /// @notice The ENS subdomain registrar registering the PluginRepo names.
    ENSSubdomainRegistrar public immutable subdomainRegistrar;

    /// @notice Emitted if a new plugin repository is registered.
    /// @param name The name of the plugin repository.
    /// @param pluginRepo The address of the plugin repository.
    event PluginRepoRegistered(string name, address pluginRepo);

    /// @param _managingDao The interface of the DAO managing the components permissions.
    /// @param _subdomainRegistrar The ENS subdomain registrar registering the DAO names.
    constructor(IDAO _managingDao, ENSSubdomainRegistrar _subdomainRegistrar)
        InterfaceBasedRegistry(_managingDao, type(IPluginRepo).interfaceId)
    {
        subdomainRegistrar = _subdomainRegistrar;
    }

    /// @notice Registers a plugin repository with a name and address.
    /// @param name The name of the PluginRepo.
    /// @param registrant The address of the PluginRepo contract.
    function registerPluginRepo(string calldata name, address registrant)
        external
        auth(PLUGIN_REGISTER_PERMISSION_ID)
    {
        _register(registrant);

        bytes32 labelhash = keccak256(bytes(name));
        subdomainRegistrar.registerSubnode(labelhash, registrant);

        emit PluginRepoRegistered(name, registrant);
    }
}
