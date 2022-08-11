// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/Context.sol";

import "../IDAO.sol";
import "../permission/PermissionManager.sol";

import "../../utils/AppStorage.sol";

/// @title AragonPlugin
/// @notice An Abtract Aragon Plugin(NON-UPGRADABLE) that plugin developers have to inherit from.
abstract contract AragonPlugin is AppStorage, Context {

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
