// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "./Permissions.sol";
import "../../core/erc165/AdaptiveERC165.sol";

/// @title An ERC165-based registry for contracts
/// @author Michel Heuer, Sarkawt Noori - Aragon Association - 2022
/// @notice This contract allows to register contracts
/// TODO: Find a better nameing instead of ERC165Registry
abstract contract ERC165Registry is Permissions, UUPSUpgradeable {
    bytes32 public constant REGISTER_ROLE = keccak256("REGISTER_ROLE");
    bytes32 public constant UPGRADE_ROLE = keccak256("UPGRADE_ROLE");

    bytes4 public contractInterfaceId;

    mapping(address => bool) public registrees;

    /// @notice Thrown if the contract is already registered
    /// @param registrant The address of the contract to be registered
    error ContractAlreadyRegistered(address registrant);

    /// @notice Thrown if the contract does not support the required interface
    /// @param registrant The address of the contract to be registered
    error ContractInterfaceInvalid(address registrant);

    /// @notice Thrown if the address is not a contract
    /// @param registrant The address of the contract to be registered
    error ContractAddressInvalid(address registrant);

    /// @notice Initializes the component
    /// @dev This is required for the UUPS upgradability pattern
    /// @param _managingDao The interface of the DAO managing the components permissions
    /// @param _contractInterfaceId The ERC165 interface id of the contracts to be registered
    function __ERC165Registry_init(IDAO _managingDao, bytes4 _contractInterfaceId)
        internal
        virtual
        onlyInitializing
    {
        __Permissions_init(_managingDao);

        contractInterfaceId = _contractInterfaceId;
    }

    /// @dev Used to check the permissions within the upgradability pattern implementation of OZ
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_ROLE) {}

    /// @notice Register an ERC165 contract address
    /// @dev The managing DAO needs to grant REGISTER_ROLE to registrar
    /// @param registrant The address of an ERC165 contract
    function _register(address registrant) internal auth(REGISTER_ROLE) {
        if (!Address.isContract(registrant)) revert ContractAddressInvalid(registrant);
        if (!AdaptiveERC165(registrant).supportsInterface(contractInterfaceId))
            revert ContractInterfaceInvalid(registrant);

        if (registrees[registrant]) revert ContractAlreadyRegistered({registrant: registrant});

        registrees[registrant] = true;
    }
}
