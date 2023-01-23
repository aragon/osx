// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {ENSSubdomainRegistrar} from "./ens/ENSSubdomainRegistrar.sol";
import {IDAO} from "../core/IDAO.sol";
import {InterfaceBasedRegistry} from "./InterfaceBasedRegistry.sol";
import {IPluginRepo} from "../plugin/IPluginRepo.sol";

/// @title PluginRepoRegistry
/// @author Aragon Association - 2022
/// @notice This contract maintains an address-based registery of plugin repositories in the Aragon App DAO framework.
contract PluginRepoRegistry is InterfaceBasedRegistry {
    /// @notice The ID of the permission required to call the `register` function.
    bytes32 public constant REGISTER_PLUGIN_REPO_PERMISSION_ID =
        keccak256("REGISTER_PLUGIN_REPO_PERMISSION");

    /// @notice The ENS subdomain registrar registering the PluginRepo names.
    ENSSubdomainRegistrar public subdomainRegistrar;

    /// @notice Emitted if a new plugin repository is registered.
    /// @param name The name of the plugin repository.
    /// @param pluginRepo The address of the plugin repository.
    event PluginRepoRegistered(string name, address pluginRepo);

    /// @notice Thrown if the plugin name doesn't match the regex `[0-9a-z\-]`
    error InvalidPluginName(string name);

    /// @dev Used to disallow initializing the implementation contract by an attacker for extra safety.
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the contract by setting calling the `InterfaceBasedRegistry` base class initialize method.
    /// @param _dao The address of the managing DAO.
    /// @param _subdomainRegistrar The `ENSSubdomainRegistrar` where `ENS` subdomain will be registered.
    function initialize(IDAO _dao, ENSSubdomainRegistrar _subdomainRegistrar) public initializer {
        bytes4 pluginRepoInterfaceId = type(IPluginRepo).interfaceId;
        __InterfaceBasedRegistry_init(_dao, pluginRepoInterfaceId);

        subdomainRegistrar = _subdomainRegistrar;
    }

    /// @notice Registers a plugin repository with a name and address.
    /// @param name The name of the PluginRepo.
    /// @param pluginRepo The address of the PluginRepo contract.
    function registerPluginRepo(
        string calldata name,
        address pluginRepo
    ) external auth(REGISTER_PLUGIN_REPO_PERMISSION_ID) {
        // The caller(PluginRepoFactory) explicitly checks
        // if the name is empty and reverts.

        if (!_checkNameValidity(name)) {
            revert InvalidPluginName({name: name});
        }

        bytes32 labelhash = keccak256(bytes(name));
        subdomainRegistrar.registerSubnode(labelhash, pluginRepo);

        _register(pluginRepo);

        emit PluginRepoRegistered(name, pluginRepo);
    }

    /// @notice Checks if the name is either 0-9, a-z or a dash (-).
    /// @param _name The name of the plugin.
    /// @return `true` if the name is valid or `false` if at least one char is invalid.
    /// @dev Aborts on the first invalid char found.
    function _checkNameValidity(string calldata _name) internal pure returns (bool) {
        bytes calldata nameBytes = bytes(_name);
        uint256 nameLength = nameBytes.length;
        for (uint256 i; i < nameLength; i++) {
            uint8 char = uint8(nameBytes[i]);

            // if char is between 0-9
            if (char > 47 && char < 58) {
                continue;
            }

            // if char is between a-z
            if (char > 96 && char < 123) {
                continue;
            }

            // if char is -
            if (char == 45) {
                continue;
            }

            // invalid if one char doesn't work with the rules above
            return false;
        }
        return true;
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[49] private __gap;
}
