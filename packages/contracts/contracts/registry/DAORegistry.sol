// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {ENSSubdomainRegistrar} from "./ens/ENSSubdomainRegistrar.sol";
import {IDAO} from "../core/IDAO.sol";
import {BulkPermissionsLib} from "../core/permission/BulkPermissionsLib.sol";
import {InterfaceBasedRegistry} from "./InterfaceBasedRegistry.sol";

import {PluginSetupProcessor} from "../plugin/PluginSetupProcessor.sol";

/// @title Register your unique DAO name
/// @author Aragon Association - 2022
/// @notice This contract provides the possiblity to register a DAO.
contract DAORegistry is InterfaceBasedRegistry {
    /// @notice The ID of the permission required to call the `register` function.
    bytes32 public constant REGISTER_DAO_PERMISSION_ID = keccak256("REGISTER_DAO_PERMISSION");

    /// @notice The plugin object including plugin address, helpers addresses, and the list of permission.
    struct PluginPackage {
        address plugin;
        address[] helpers;
        BulkPermissionsLib.ItemMultiTarget[] permissions;
    }

    /// @notice The ENS subdomain registrar registering the DAO names.
    ENSSubdomainRegistrar private subdomainRegistrar;

    /// @notice Emitted when a new DAO is registered.
    /// @param dao The address of the DAO contract.
    /// @param creator The address of the creator.
    /// @param name The DAO name.
    event DAORegistered(
        address indexed dao,
        address indexed creator,
        string name,
        PluginPackage[] plugins
    );

    /// @notice Initializes the contract.
    /// @param _managingDao the managing DAO address.
    function initialize(IDAO _managingDao, ENSSubdomainRegistrar _subdomainRegistrar)
        public
        initializer
    {
        __InterfaceBasedRegistry_init(_managingDao, type(IDAO).interfaceId);
        subdomainRegistrar = _subdomainRegistrar;
    }

    /// @notice Registers a DAO by its address.
    /// @dev A name is unique within the Aragon DAO framework and can get stored here.
    /// @param _dao The address of the DAO contract.
    /// @param _creator The address of the creator.
    /// @param _name The DAO name.
    function register(
        IDAO _dao,
        address _creator,
        string calldata _name,
        PluginPackage[] calldata plugins
    ) external auth(REGISTER_DAO_PERMISSION_ID) {
        address daoAddr = address(_dao);

        _register(daoAddr);

        bytes32 labelhash = keccak256(bytes(_name));

        subdomainRegistrar.registerSubnode(labelhash, daoAddr);

        emit DAORegistered(daoAddr, _creator, _name, plugins);
    }
}
