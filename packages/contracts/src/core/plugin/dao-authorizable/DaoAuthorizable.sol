// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";

import {IDAO} from "../../dao/IDAO.sol";
import {_auth} from "../../utils/auth.sol";

/// @title DaoAuthorizable
/// @author Aragon Association - 2022-2023
/// @notice An abstract contract providing a meta-transaction compatible modifier for non-upgradeable contracts instantiated via the `new` keyword to authorize function calls through an associated DAO.
abstract contract DaoAuthorizable is Context {
    /// @notice The associated DAO managing the permissions of inheriting contracts.
    IDAO private immutable dao_;

    /// @notice Constructs the contract by setting the associated DAO.
    /// @param _dao The associated DAO address.
    constructor(IDAO _dao) {
        dao_ = _dao;
    }

    /// @notice Returns the DAO contract.
    /// @return The DAO contract.
    function dao() public view returns (IDAO) {
        return dao_;
    }

    /// @notice A modifier to make functions on inheriting contracts authorized. Permissions to call the function are checked through the associated DAO's permission manager.
    /// @param _permissionId The permission identifier required to call the method this modifier is applied to.
    modifier auth(bytes32 _permissionId) {
        _auth(dao_, address(this), _msgSender(), _permissionId, _msgData());
        _;
    }
}
