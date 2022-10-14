// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/Context.sol";

import {_auth} from "../../utils/auth.sol";
import {IDAO} from "../IDAO.sol";

/// @title DaoAuthorizableBase
/// @author Aragon Association - 2022
/// @notice An abstract contract providing a meta transaction compatible modifier to authorize function calls through an associated DAO.
abstract contract DaoAuthorizableBase is Context {
    /// @notice The associated DAO managing the permissions of inheriting contracts.
    IDAO internal dao;

    /// @notice Returns the DAO contract.
    /// @return IDAO The DAO contract.
    function getDAO() public view returns (IDAO) {
        return dao;
    }

    /// @notice A modifier to be used to check permissions on a target contract via the associated DAO.
    /// @param _permissionId The permission identifier required to call the method this modifier is applied to.
    modifier auth(bytes32 _permissionId) {
        _auth(dao, address(this), _msgSender(), _permissionId, _msgData());
        _;
    }
}
