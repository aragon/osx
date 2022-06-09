// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "./Component.sol";

/// @title An ERC165-based registry for contracts
/// @author Aragon Association - 2022
/// @notice This contract allows to register contracts
abstract contract ERC165Registry is Component {
    bytes32 public constant REGISTER_ROLE = keccak256("REGISTER_ROLE");

    bytes4 public contractInterfaceId;

    mapping(address => bool) public registrees;

    /// @notice Thrown if the contract is already registered
    /// @param registrant The address of the contract to be registered
    error ContractAlreadyRegistered(address registrant);

    /// @notice Thrown if the contract does not support the required interface
    /// @param registrant The address of the contract to be registered
    error ContractInterfaceInvalid(address registrant);

    /// @notice Initializes the component
    /// @dev This is required for the UUPS upgradability pattern
    /// @param _managingDao The interface of the DAO managing the components permissions
    /// @param _contractInterfaceId The ERC165 interface id of the contracts to be registered
    function __ERC165Registry_init(IDAO _managingDao, bytes4 _contractInterfaceId)
        internal
        virtual
        onlyInitializing
    {
        __Component_init(_managingDao);

        contractInterfaceId = _contractInterfaceId;
    }

    function _register(address registrant) internal auth(REGISTER_ROLE) {
        if (!AdaptiveERC165(registrant).supportsInterface(contractInterfaceId))
            revert ContractInterfaceInvalid(registrant);

        if (registrees[registrant]) revert ContractAlreadyRegistered({registrant: registrant});

        registrees[registrant] = true;
    }
}
