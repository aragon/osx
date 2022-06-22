/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "../core/component/InterfaceBaseRegistry.sol";
import "../core/IDAO.sol";
import "../aragonPlugin/IPluginRepo.sol";

/// @title Register plugin
/// @author Sarkawt Noori - Aragon Association - 2022
/// @notice This contract provides the possiblity to register a plugin pluginRepo by a unique address.
contract AragonPluginRegistry is InterfaceBaseRegistry {
    /// @notice Emitted if a new PluginRepo is registered
    /// @param name The name of the PluginRepo
    /// @param pluginRepo The address of the PluginRepo
    event NewPluginRepo(string name, address pluginRepo);

    /// @notice Initializes the contract
    /// @param _dao the managing DAO address
    function initialize(IDAO _dao) public initializer {
        bytes4 pluginRepoInterfaceId = type(IPluginRepo).interfaceId;
        __InterfaceBaseRegistry_init(_dao, pluginRepoInterfaceId);
    }

    /// @notice Registers a PluginRepo
    /// @param name The name of the PluginRepo
    /// @param registrant The address of the PluginRepo contract
    function register(string calldata name, address registrant) external {
        _register(registrant);

        emit NewPluginRepo(name, registrant);
    }
}
