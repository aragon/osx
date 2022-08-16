// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol"; 
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import { PermissionManager } from "../permission/PermissionManager.sol";

import "../../utils/AppStorage.sol";
import "../IDAO.sol";

/// @title AragonPlugin
/// @notice An abstract contract to inherit from when creating a non-upgradable plugin.
abstract contract AragonPlugin is Initializable, ERC165, AppStorage, Context {

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

    /// @notice adds a IERC165 to check whether contract supports AragonPlugin interface or not.
    /// @dev See {ERC165Upgradeable-supportsInterface}.
    /// @return bool whether it supports the IERC165 or AragonPlugin
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(AragonPlugin).interfaceId || super.supportsInterface(interfaceId);
    }

}
