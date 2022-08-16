// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import { PermissionManager } from "../permission/PermissionManager.sol";

import "../../utils/AppStorage.sol";
import "../IDAO.sol";

/// @title AragonUpgradablePlugin
/// @notice An abstract contract to inherit from when creating an `UUPSUpgradable` plugin.
abstract contract AragonUpgradablePlugin is Initializable, ERC165Upgradeable, AppStorage, ContextUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADE_PERMISSION_ID = keccak256("UPGRADE_PERMISSION");

    // NOTE: When adding new state variables to the contract, the size of `_gap` has to be adapted below as well.

    /// @dev Auth modifier used in all components of a DAO to check the permissions.
    /// @param _permissionId The hash of the permission identifier
    modifier auth(bytes32 _permissionId)  {
        IDAO dao = dao(); 
        if(!dao.hasPermission(address(this), _msgSender(), _permissionId, _msgData())) {
            revert PermissionManager.Unauthorized({
                here: address(this), 
                where: address(this), 
                who: _msgSender(), 
                permissionId: _permissionId
            });
        }
        _;
    }

    /// @notice used to check the current base logic contract proxy delegates to.
    /// @return address the address of current base logic contract.
    function getImplementationAddress() public view returns (address) {
        return _getImplementation();
    }

    /// @notice adds a IERC165 to check whether contract supports AragonUpgradablePlugin interface or not.
    /// @dev See {ERC165Upgradeable-supportsInterface}.
    /// @return bool whether it supports the IERC165 or AragonUpgradablePlugin
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(AragonUpgradablePlugin).interfaceId || super.supportsInterface(interfaceId);
    }

    /// @dev Used to check the permissions within the upgradability pattern implementation of OZ
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_PERMISSION_ID) { }

    /// @notice Used by `AragonUpgradablePlugin` to reserve storage space in case of state variable additions for this contract.
    /// @dev After the addition of state variables, the number of storage slots including `_gap` size must add up to 50.
    uint256[50] private __gap;
}
