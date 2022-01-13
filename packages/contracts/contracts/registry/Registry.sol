/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "../core/DAO.sol";

/// @title Register your unique DAO name
/// @author Samuel Furter - Aragon Association - 2021
/// @notice This contract provides the possiblity to register a DAO by a unique name.
contract Registry {
    event NewDAORegistered(DAO indexed dao, address indexed creator, address indexed token, string name);

    mapping(string => bool) public daos;

    /// @notice Registers a DAO by his name
    /// @dev A name is unique within the Aragon DAO framework and can get stored here
    /// @param name The name of the DAO
    /// @param dao The address of the DAO contract
    function register(string calldata name, DAO dao, address creator, address token) external {
        require(daos[name] == false, "name already in use");

        daos[name] = true;
        
        emit NewDAORegistered(dao, creator, token, name);
    }
}
