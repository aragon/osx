/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "../core/component/Component.sol";

/// @title Register a DAO
/// @author Aragon Association - 2022
/// @notice This contract allows to register a DAO by its address
contract Registry is Component {
    bytes32 public constant REGISTER_DAO_ROLE = keccak256("REGISTER_DAO_ROLE");

    mapping(IDAO => bool) public daos;

    bytes4 internal constant REGISTRY_INTERFACE_ID = this.register.selector;

    /// @notice Thrown if the DAO name is already registered
    /// @param dao The address requested for registration
    error DAOAlreadyRegistered(IDAO dao);

    /// @notice Emitted if a new DAO is registered
    /// @param dao The address of the DAO contract
    /// @param creator The address of the creator
    /// @param name The name of the DAO
    event NewDAORegistered(IDAO indexed dao, address indexed creator, string name);

    /// @notice Initializes the component
    /// @dev This is required for the UUPS upgradability pattern
    /// @param _dao The IDAO interface of the associated DAO
    function initialize(IDAO _dao) external initializer {
        _registerStandard(REGISTRY_INTERFACE_ID);

        __Component_init(_dao);
    }

    // This function is intended to be called by the `DAOFactory`

    /// @notice Registers a DAO by its address
    /// @dev A name is unique within the Aragon DAO framework and can get stored here
    /// @param dao The address of the DAO contract
    /// @param name The name of the DAO
    function register(
        IDAO dao,
        address creator,
        string calldata name
    ) external auth(REGISTER_DAO_ROLE) {
        if (daos[dao]) revert DAOAlreadyRegistered({dao: dao});

        daos[dao] = true;

        emit NewDAORegistered(dao, creator, name);
    }
}
