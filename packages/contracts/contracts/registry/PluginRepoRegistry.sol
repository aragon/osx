// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "./InterfaceBasedRegistry.sol";
import "../core/IDAO.sol";
import "../plugin/IPluginRepo.sol";

/// @title PluginRepoRegistry
/// @author Aragon Association - 2022
/// @notice This contract maintains an address-based registery of plugin repositories in the Aragon App DAO framework.
contract PluginRepoRegistry is InterfaceBasedRegistry {
    /// @notice The ID of the permission required to call the `register` function.
    bytes32 public constant PLUGIN_REGISTER_PERMISSION_ID = keccak256("PLUGIN_REGISTER_PERMISSION");

    /// @notice Emitted if a new plugin repository is registered.
    /// @param name The name of the plugin repository.
    /// @param pluginRepo The address of the plugin repository.
    event PluginRepoRegistered(string name, address pluginRepo);

    /// @notice Initializes the contract by setting calling the `InterfaceBasedRegistry` base class initialize method.
    /// @param _dao The address of the managing DAO.
    function initialize(IDAO _dao) public initializer {
        bytes4 pluginRepoInterfaceId = type(IPluginRepo).interfaceId;
        __InterfaceBasedRegistry_init(_dao, pluginRepoInterfaceId);
    }

    /// @notice Registers a plugin repository with a name and address.
    /// @param name The name of the PluginRepo.
    /// @param registrant The address of the PluginRepo contract.
    function registerPlugin(string calldata name, address registrant)
        external
        auth(PLUGIN_REGISTER_PERMISSION_ID)
    {
        // TODO: Implement ENS subdomain. Currently plugin's name can be repeated, will be resolved once the ENS subdomain is implemented.

        _register(registrant);

        emit PluginRepoRegistered(name, registrant);
    }
}
