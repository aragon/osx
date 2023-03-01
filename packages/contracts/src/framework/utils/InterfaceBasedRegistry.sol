// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import {DaoAuthorizableUpgradeable} from "../../core/plugin/dao-authorizable/DaoAuthorizableUpgradeable.sol";
import {IDAO} from "../../core/dao/IDAO.sol";

/// @title InterfaceBasedRegistry
/// @author Aragon Association - 2022-2023
/// @notice An [ERC-165](https://eips.ethereum.org/EIPS/eip-165)-based registry for contracts
abstract contract InterfaceBasedRegistry is UUPSUpgradeable, DaoAuthorizableUpgradeable {
    using ERC165CheckerUpgradeable for address;

    /// @notice The ID of the permission required to call the `_authorizeUpgrade` function.
    bytes32 public constant UPGRADE_REGISTRY_PERMISSION_ID =
        keccak256("UPGRADE_REGISTRY_PERMISSION");

    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID that the target contracts being registered must support.
    bytes4 public targetInterfaceId;

    /// @notice The mapping containing the registry entries returning true for registererd contract addresses.
    mapping(address => bool) public entries;

    /// @notice Thrown if the contract is already registered.
    /// @param registrant The address of the contract to be registered.
    error ContractAlreadyRegistered(address registrant);

    /// @notice Thrown if the contract does not support the required interface.
    /// @param registrant The address of the contract to be registered.
    error ContractInterfaceInvalid(address registrant);

    /// @notice Thrown if the contract do not support ERC165.
    /// @param registrant The address of the contract.
    error ContractERC165SupportInvalid(address registrant);

    /// @notice Initializes the component.
    /// @dev This is required for the UUPS upgradability pattern.
    /// @param _managingDao The interface of the DAO managing the components permissions.
    /// @param _targetInterfaceId The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface id of the contracts to be registered.
    function __InterfaceBasedRegistry_init(
        IDAO _managingDao,
        bytes4 _targetInterfaceId
    ) internal virtual onlyInitializing {
        __DaoAuthorizableUpgradeable_init(_managingDao);

        targetInterfaceId = _targetInterfaceId;
    }

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeabilty mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_REGISTRY_PERMISSION_ID` permission.
    function _authorizeUpgrade(
        address
    ) internal virtual override auth(UPGRADE_REGISTRY_PERMISSION_ID) {}

    /// @notice Register an [ERC-165](https://eips.ethereum.org/EIPS/eip-165) contract address.
    /// @dev The managing DAO needs to grant REGISTER_PERMISSION_ID to registrar.
    /// @param _registrant The address of an [ERC-165](https://eips.ethereum.org/EIPS/eip-165) contract.
    function _register(address _registrant) internal {
        if (entries[_registrant]) {
            revert ContractAlreadyRegistered({registrant: _registrant});
        }

        // Will revert if address is not a contract or doesn't fully support targetInterfaceId + ERC165.
        if (!_registrant.supportsInterface(targetInterfaceId)) {
            revert ContractInterfaceInvalid(_registrant);
        }

        entries[_registrant] = true;
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[48] private __gap;
}
