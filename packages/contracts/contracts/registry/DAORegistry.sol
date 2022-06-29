// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../core/IDAO.sol";
import "./InterfaceBasedRegistry.sol";

/// @title Register your unique DAO name
/// @author Aragon Association - 2021
/// @notice This contract provides the possiblity to register a DAO by a unique name.
contract DAORegistry is InterfaceBasedRegistry {
    bytes32 public constant REGISTER_ROLE = keccak256("REGISTER_ROLE");

    /// @notice Thrown if the DAO name is already registered
    /// @param name The DAO name requested for registration
    error RegistryNameAlreadyUsed(string name);

    /// @notice Emitted when a new DAO is registered
    /// @param dao The address of the DAO contract
    /// @param creator The address of the creator
    /// @param name The name of the DAO
    event NewDAORegistered(IDAO indexed dao, address indexed creator, string name);

    /// @notice Initializes the contract
    /// @param _dao the managing DAO address
    function initialize(IDAO _dao) public initializer {
        bytes4 daoInterfaceId = type(IDAO).interfaceId;
        __InterfaceBasedRegistry_init(_dao, daoInterfaceId);
    }

    /// @notice Registers a DAO by his name
    /// @dev A name is unique within the Aragon DAO framework and can get stored here
    /// @param name The name of the DAO
    /// @param dao The address of the DAO contract
    function register(
        string calldata name,
        IDAO dao,
        address creator
    ) external auth(REGISTER_ROLE) {
        _register(address(dao));

        emit NewDAORegistered(dao, creator, name);
    }
}
