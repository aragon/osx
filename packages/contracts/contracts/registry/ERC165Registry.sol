// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "./ERC165RegistryBase.sol";

/// @title Concrete implementation of an ERC165-based registry
/// @author Aragon Association - 2022
/// @notice This contract allows to register contracts complying with the ERC165 standard
contract ERC165Registry is ERC165RegistryBase {
    bytes32 public constant REGISTER_ROLE = keccak256("REGISTER_ROLE");
    bytes4 internal constant REGISTRY_INTERFACE_ID = this.register.selector;

    /// @notice Initializes the registry
    /// @param _managingDao The interface of the DAO managing the components permissions
    /// @param _contractInterfaceId The ERC165 interface id of the contracts to be registered
    function initialize(IDAO _managingDao, bytes4 _contractInterfaceId) public initializer {
        __ERC165RegistryBase_init(_managingDao, _contractInterfaceId);
        
        _registerStandard(REGISTRY_INTERFACE_ID);
    }

    /// @notice Registers a contract by its address
    /// @param registrant The address of the contract to be registered
    function register(address registrant) external auth(REGISTER_ROLE) {
        _register(registrant);
    }
}
