// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import {IDAO} from "../dao/IDAO.sol";

/// @notice Thrown if a call is unauthorized in the associated DAO.
/// @param dao The associated DAO.
/// @param where The context in which the authorization reverted.
/// @param who The address (EOA or contract) missing the permission.
/// @param permissionId The permission identifier.
error DaoUnauthorized(address dao, address where, address who, bytes32 permissionId);

/// @notice Free function to to be used by the auth modifier to check permissions on a target contract via the associated DAO.
/// @param _permissionId The permission identifier.
function _auth(
    IDAO _dao,
    address _addressThis,
    address _msgSender,
    bytes32 _permissionId,
    bytes calldata _msgData
) view {
    if (!_dao.hasPermission(_addressThis, _msgSender, _permissionId, _msgData))
        revert DaoUnauthorized({
            dao: address(_dao),
            where: _addressThis,
            who: _msgSender,
            permissionId: _permissionId
        });
}
