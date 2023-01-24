// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {ENSSubdomainRegistrar} from "./ens/ENSSubdomainRegistrar.sol";
import {IDAO} from "../core/IDAO.sol";
import {InterfaceBasedRegistry} from "./InterfaceBasedRegistry.sol";
import {isSubdomainValid} from "./RegistryUtils.sol";

/// @title Register your unique DAO name
/// @author Aragon Association - 2022
/// @notice This contract provides the possiblity to register a DAO.
contract DAORegistry is InterfaceBasedRegistry {
    /// @notice The ID of the permission required to call the `register` function.
    bytes32 public constant REGISTER_DAO_PERMISSION_ID = keccak256("REGISTER_DAO_PERMISSION");

    /// @notice The ENS subdomain registrar registering the DAO names.
    ENSSubdomainRegistrar private subdomainRegistrar;

    /// @notice Thrown if the DAO repository name is empty.
    error EmptyDaoName();

    /// @notice Thrown if the DAO name doesn't match the regex `[0-9a-z\-]`
    error InvalidDaoName(string name);

    /// @notice Emitted when a new DAO is registered.
    /// @param dao The address of the DAO contract.
    /// @param creator The address of the creator.
    /// @param name The DAO name.
    event DAORegistered(address indexed dao, address indexed creator, string name);

    /// @dev Used to disallow initializing the implementation contract by an attacker for extra safety.
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the contract.
    /// @param _managingDao the managing DAO address.
    /// @param _subdomainRegistrar The `ENSSubdomainRegistrar` where `ENS` subdomain will be registered.
    function initialize(
        IDAO _managingDao,
        ENSSubdomainRegistrar _subdomainRegistrar
    ) public initializer {
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
        string calldata _name
    ) external auth(REGISTER_DAO_PERMISSION_ID) {
        address daoAddr = address(_dao);

        if (!(bytes(_name).length > 0)) {
            revert EmptyDaoName();
        }

        if (!isSubdomainValid(_name)) {
            revert InvalidDaoName({name: _name});
        }

        _register(daoAddr);

        bytes32 labelhash = keccak256(bytes(_name));

        subdomainRegistrar.registerSubnode(labelhash, daoAddr);

        emit DAORegistered(daoAddr, _creator, _name);
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[49] private __gap;
}
