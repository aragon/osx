/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "../core/DAO.sol";

/// @title Register your unique DAO name
/// @author Samuel Furter - Aragon Association - 2021
/// @notice This contract provides the possiblity to register a DAO by a unique name.
contract Registry {

    /// @notice Thrown if the DAO name is already registered
    /// @param name The DAO name requested for registration
    error RegistryNameAlreadyUsed(string name);

    /// @notice Emitted if a new DAO is registered
    /// @param dao The address of the DAO contract
    /// @param creator The address of the creator
    /// @param name The name of the DAO
    event NewDAORegistered(DAO indexed dao, address indexed creator, address indexed token, string name);

    mapping(string => bool) public daos;

    /// @notice Registers a DAO by his name
    /// @dev A name is unique within the Aragon DAO framework and can get stored here
    /// @param name The name of the DAO
    /// @param dao The address of the DAO contract
    function register(string calldata name, DAO dao, address creator, address token) external {
        if(daos[name] != false) revert RegistryNameAlreadyUsed({name: name});

        daos[name] = true;
        
        emit NewDAORegistered(dao, creator, token, name);
    }
}
