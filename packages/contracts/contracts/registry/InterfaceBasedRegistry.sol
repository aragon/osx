// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "../core/component/Permissions.sol";
import "../core/erc165/AdaptiveERC165.sol";

/// @title An ERC165-based registry for contracts
/// @author Aragon Association - 2022
/// @notice This contract allows to register contracts
abstract contract InterfaceBasedRegistry is Permissions, UUPSUpgradeable {
    bytes32 public constant UPGRADE_ROLE = keccak256("UPGRADE_ROLE");

    bytes4 public targetInterfaceId;

    mapping(address => bool) public entries;

    /// @notice Thrown if the contract is already registered
    /// @param registrant The address of the contract to be registered
    error ContractAlreadyRegistered(address registrant);

    /// @notice Thrown if the contract does not support the required interface
    /// @param registrant The address of the contract to be registered
    error ContractInterfaceInvalid(address registrant);

    /// @notice Thrown if the address is not a contract
    /// @param registrant The address of the contract to be registered
    error ContractAddressInvalid(address registrant);

    /// @notice Thrown if the contract do not support ERC165
    /// @param registrant The address of the contract
    error ContractERC165SupportInvalid(address registrant);

    /// @notice Initializes the component
    /// @dev This is required for the UUPS upgradability pattern
    /// @param _managingDao The interface of the DAO managing the components permissions
    /// @param _targetInterfaceId The ERC165 interface id of the contracts to be registered
    function __InterfaceBasedRegistry_init(IDAO _managingDao, bytes4 _targetInterfaceId)
        internal
        virtual
        onlyInitializing
    {
        __Permissions_init(_managingDao);

        targetInterfaceId = _targetInterfaceId;
    }

    /// @dev Used to check the permissions within the upgradability pattern implementation of OZ
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_ROLE) {}

    /// @notice Register an ERC165 contract address
    /// @dev The managing DAO needs to grant REGISTER_ROLE to registrar
    /// @param registrant The address of an ERC165 contract
    function _register(address registrant) internal {
        if (!Address.isContract(registrant)) {
            revert ContractAddressInvalid({registrant: registrant});
        }

        if (entries[registrant]) revert ContractAlreadyRegistered({registrant: registrant});

        try AdaptiveERC165(registrant).supportsInterface(targetInterfaceId) returns (bool result) {
            if (!result) revert ContractInterfaceInvalid(registrant);
        } catch {
            revert ContractERC165SupportInvalid({registrant: registrant});
        }

        entries[registrant] = true;
    }
}
