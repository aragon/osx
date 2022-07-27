// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

import "../permission/PermissionManager.sol";
import "./../IDAO.sol";

/// @title DaoAuthorizable
/// @author Aragon Association - 2022
/// @notice An abstract contract providing a meta transaction compatible modifier to make functions permissioned through an associated DAO.
/// This contract provides an `auth` modifier that can be applied to functions in inheriting contracts. The permission to call these functions is managed by the associated DAO.
/// @dev Make sure to call `__DaoAuthorizable_init` during initialization of the inheriting contract.
///      This contract is compatible with meta transactions through OZ's `ContextUpgradable`.
abstract contract DaoAuthorizable is Initializable, ContextUpgradeable {
    /// @notice The associated DAO managing the permissions of inheriting contracts.
    IDAO internal dao;

    /// @notice Thrown if a permission is missing.
    /// @param dao The associated DAO.
    /// @param here The context in which the authorization reverted.
    /// @param where The contract requiring the permission.
    /// @param who The address (EOA or contract) missing the permission.
    /// @param permissionId The permission identifier.
    error DAOPermissionMissing(
        address dao,
        address here,
        address where,
        address who,
        bytes32 permissionId
    );

    /// @notice Initializes the contract by setting the associated DAO.
    /// @param _dao The associated DAO address.
    function __DaoAuthorizable_init(IDAO _dao) internal virtual onlyInitializing {
        dao = _dao;
    }

    /// @notice A modifier to be used to check permissions on a target contract via the associated DAO.
    /// @param _permissionId The permission identifier required to call the method this modifier is applied to.
    modifier auth(bytes32 _permissionId) {
        if (!dao.hasPermission(address(this), _msgSender(), _permissionId, _msgData()))
            revert DAOPermissionMissing({
                dao: address(dao),
                here: address(this),
                where: address(this),
                who: _msgSender(),
                permissionId: _permissionId
            });

        _;
    }
}
