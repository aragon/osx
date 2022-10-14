// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {DaoAuthorizableUpgradeable} from "../component/DaoAuthorizableUpgradeable.sol";
import {IDAO} from "../IDAO.sol";
import {PluginUpgradeable} from "./PluginUpgradeable.sol";

/// @title PluginUUPSUpgradeable
/// @author Aragon Association - 2022
/// @notice An abstract, upgradeable contract to inherit from when creating a plugin being deployed via the UUPS pattern (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
abstract contract PluginUUPSUpgradeable is PluginUpgradeable, UUPSUpgradeable {
    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 public constant PLUGIN_UUPS_UPGRADEABLE_INTERFACE_ID =
        type(PluginUUPSUpgradeable).interfaceId;

    /// @notice The ID of the permission required to call the `_authorizeUpgrade` function.
    bytes32 public constant UPGRADE_PERMISSION_ID = keccak256("UPGRADE_PERMISSION");

    // NOTE: When adding new state variables to the contract, the size of `_gap` has to be adapted below as well.

    /// @notice Checks if an interface is supported by this or its parent contract.
    /// @param _interfaceId The ID of the interace.
    /// @return bool Returns true if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == PLUGIN_UUPS_UPGRADEABLE_INTERFACE_ID ||
            _interfaceId == PLUGIN_UPGRADEABLE_INTERFACE_ID ||
            super.supportsInterface(_interfaceId);
    }

    /// @notice Returns the address of the implementation contract in the [proxy storage slot](https://eips.ethereum.org/EIPS/eip-1967) slot the [UUPS proxy](https://eips.ethereum.org/EIPS/eip-1822) is pointing to.
    /// @return address The address of the implementation contract.
    function getImplementationAddress() public view returns (address) {
        return _getImplementation();
    }

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeabilty mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_PERMISSION_ID` permission.
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_PERMISSION_ID) {}

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[50] private __gap;
}
