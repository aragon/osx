// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {PermissionManager} from "../permission/PermissionManager.sol";

import {AppStorage} from "../../utils/AppStorage.sol";
import {IDAO} from "../IDAO.sol";
import {DaoAuthorizableUpgradeable} from "../component/DaoAuthorizableUpgradeable.sol";

/// @title PluginUUPSUpgradeable
/// @notice An abstract contract to inherit from when creating a UUPS Upgradable contract.
abstract contract PluginUUPSUpgradeable is
    Initializable,
    ERC165Upgradeable,
    UUPSUpgradeable,
    DaoAuthorizableUpgradeable
{
    bytes4  public constant PLUGIN_UUPS_INTERFACE_ID = type(PluginUUPSUpgradeable).interfaceId;
    bytes32 public constant UPGRADE_PERMISSION_ID = keccak256("UPGRADE_PERMISSION");

    function __Plugin_init(address _dao) internal virtual onlyInitializing {
        __DaoAuthorizable_init(IDAO(_dao));
    }

    /// @notice adds a IERC165 to check whether contract supports PluginUUPSUpgradeable interface or not.
    /// @dev See {ERC165Upgradeable-supportsInterface}.
    /// @return bool whether it supports the IERC165 or PluginUUPSUpgradeable
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == PLUGIN_UUPS_INTERFACE_ID || super.supportsInterface(interfaceId);
    }

    /// @notice used to check the current base logic contract proxy delegates to.
    /// @return address the address of current base logic contract.
    function getImplementationAddress() public view returns (address) {
        return _getImplementation();
    }

    /// @dev Used to check the permissions within the upgradability pattern implementation of OZ
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_PERMISSION_ID) {}

    /// @dev This empty reserved space is put in place to allow future versions to add new
    /// variables without shifting down storage in the inheritance chain.
    /// https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    uint256[50] private __gap;
}
