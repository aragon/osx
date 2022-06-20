// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../core/component/Component.sol";

/// @title An ERC165-based registry for contracts
/// @author Aragon Association - 2022
/// @notice This contract allows to register contracts
contract ERC165Registry is Component {
    bytes4 internal constant REGISTRY_INTERFACE_ID = this.register.selector;
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
    function initialize(IDAO _managingDao, bytes4 _contractInterfaceId) public initializer {
        _registerStandard(REGISTRY_INTERFACE_ID);

        __Component_init(_managingDao);

        contractInterfaceId = _contractInterfaceId;
    }

    /// @notice Registers a contract by its address
    /// @param registrant The address of the contract to be registered
    function register(address registrant) external auth(REGISTER_ROLE) {
        _register(registrant);
    }

    function _register(address registrant) internal {
        if (!AdaptiveERC165(registrant).supportsInterface(contractInterfaceId))
            revert ContractInterfaceInvalid(registrant);

        if (registrees[registrant]) revert ContractAlreadyRegistered({registrant: registrant});

        registrees[registrant] = true;
    }
}
