// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../core/IDAO.sol";
import { InterfaceBasedRegistry } from "./InterfaceBasedRegistry.sol";

/// @title Register your unique DAO name
/// @author Aragon Association - 2022
/// @notice This contract provides the possiblity to register a DAO.
contract DAORegistry is InterfaceBasedRegistry {
    bytes32 public constant REGISTER_DAO_PERMISSION_ID = keccak256("REGISTER_DAO_PERMISSION");

    /// @notice Emitted when a new DAO is registered
    /// @param dao The address of the DAO contract
    /// @param creator The address of the creator
    /// @param name The name of the DAO
    event DAORegistered(IDAO indexed dao, address indexed creator, string name);

    /// @notice Initializes the contract
    /// @param _managingDao the managing DAO address
    function initialize(IDAO _managingDao) public initializer {
        __InterfaceBasedRegistry_init(_managingDao, type(IDAO).interfaceId);
    }

    /// @notice Registers a DAO by its address
    /// @dev A name is unique within the Aragon DAO framework and can get stored here
    /// @param name The name of the DAO
    /// @param dao The address of the DAO contract
    /// @param creator The address of the creator
    function register(
        string calldata name,
        IDAO dao,
        address creator
    ) external auth(REGISTER_DAO_PERMISSION_ID) {
        // TODO: Implement ENS subdomain. Currently DAO's name can be repeated, will be resolved once the ENS subdomain is implemented.

        _register(address(dao));

        emit DAORegistered(dao, creator, name);
    }
}
