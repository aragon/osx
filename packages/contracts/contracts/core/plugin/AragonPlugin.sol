// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol"; 

import { PermissionManager } from "../permission/PermissionManager.sol";

import "../../utils/AppStorage.sol";
import "../IDAO.sol";

/// @title AragonPlugin
/// @notice An abstract contract to inherit from when creating a non-upgradable plugin.
abstract contract AragonPlugin is Initializable, AppStorage, Context {

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

}
