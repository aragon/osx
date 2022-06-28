/*
 * SPDX-License-Identifier: MIT
 */

pragma solidity 0.8.10;

import "./InterfaceBasedRegistry.sol";
import "../core/IDAO.sol";
import "../plugin/IPluginRepo.sol";

/// @title Register plugin
/// @author Aragon Association - 2022
/// @notice This contract provides the possiblity to register a plugin pluginRepo by a unique address.
contract AragonPluginRegistry is InterfaceBasedRegistry {
    bytes32 public constant REGISTER_ROLE = keccak256("REGISTER_ROLE");

    /// @notice Emitted if a new PluginRepo is registered
    /// @param name The name of the PluginRepo
    /// @param pluginRepo The address of the PluginRepo
    event PluginRepoRegistered(string name, address pluginRepo);

    /// @notice Initializes the contract
    /// @param _dao the managing DAO address
    function initialize(IDAO _dao) public initializer {
        bytes4 pluginRepoInterfaceId = type(IPluginRepo).interfaceId;
        __InterfaceBasedRegistry_init(_dao, pluginRepoInterfaceId);
    }

    /// @notice Registers a PluginRepo
    /// @param name The name of the PluginRepo
    /// @param registrant The address of the PluginRepo contract
    function register(string calldata name, address registrant) external auth(REGISTER_ROLE) {
        _register(registrant);

        emit PluginRepoRegistered(name, registrant);
    }
}
