// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../core/component/Component.sol";

/// @title Abstract base classe for an ERC165-based registry
/// @author Aragon Association - 2022
/// @notice This contract allows to register contracts complying with the ERC165 standard
abstract contract ERC165RegistryBase is Component {
    bytes4 public contractInterfaceId;

    mapping(address => bool) public entries;

    /// @notice Initializes the component
    /// @dev This is required for the UUPS upgradability pattern
    /// @param _managingDao The interface of the DAO managing the components permissions
    /// @param _contractInterfaceId The ERC165 interface id of the contracts to be registered
    function __ERC165RegistryBase_init(IDAO _managingDao, bytes4 _contractInterfaceId)
        internal
        onlyInitializing
    {
        __Component_init(_managingDao);
        
        contractInterfaceId = _contractInterfaceId;
    }

    /// @notice Thrown if the contract is already registered
    /// @param registrant The address of the contract to be registered
    error ContractAlreadyRegistered(address registrant);

    /// @notice Thrown if the contract does not support the required interface
    /// @param registrant The address of the contract to be registered
    error ContractInterfaceInvalid(address registrant);

    /// @notice Registers a contract by its address
    /// @param registrant The address of the contract to be registered
    function _register(address registrant) internal {
        if (entries[registrant]) {
            revert ContractAlreadyRegistered({registrant: registrant});
        }

        if (!AdaptiveERC165(registrant).supportsInterface(contractInterfaceId)) {
            revert ContractInterfaceInvalid(registrant);
        }

        entries[registrant] = true;
    }
}
