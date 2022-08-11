// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

import "../IDAO.sol";
import "../permission/PermissionManager.sol";

import "../../utils/AppStorage.sol";

/// @title AragonUpgradablePlugin
/// @notice An Abtract Aragon Plugin(UUPS-UPGRADABLE) that plugin developers have to inherit from.
abstract contract AragonUpgradablePlugin is Initializable, AppStorage, ContextUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADE_PERMISSION_ID = keccak256("UPGRADE_PERMISSION");

    // NOTE: Newly added contract variables should always have the size of _gap adapted below as well

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

    /// @dev Used to check the permissions within the upgradability pattern implementation of OZ
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_PERMISSION_ID) { }

    /// @notice Used by AragonUpgradablePlugin to reserve storage space in 
    /// case of state variable additions for this contract.
    /// @dev Note that after adding one or multiple state variables, 
    /// _gap size below + all state variables this contract uses should be 50.
    uint256[50] private __gap;
}
