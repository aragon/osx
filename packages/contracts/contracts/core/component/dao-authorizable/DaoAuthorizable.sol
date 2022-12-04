// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";

import {IDAO} from "../../IDAO.sol";
import {_auth} from "../../../utils/auth.sol";

/// @title DaoAuthorizable
/// @author Aragon Association - 2022
/// @notice An abstract contract providing a meta transaction compatible modifier for constructable contracts instantiated via the `new` keyword to authorize function calls through an associated DAO.
abstract contract DaoAuthorizable is Context {
    /// @notice The associated DAO managing the permissions of inheriting contracts.
    IDAO private immutable _dao;

    /// @notice A modifier to be used to check permissions on a target contract via the associated DAO.
    /// @param _permissionId The permission identifier required to call the method this modifier is applied to.
    modifier auth(bytes32 _permissionId) {
        _auth(_dao, address(this), _msgSender(), _permissionId, _msgData());
        _;
    }

    /// @notice Constructs the contract by setting the associated DAO.
    /// @param dao_ The associated DAO address.
    constructor(IDAO dao_) {
        _dao = dao_;
    }

    /// @notice Returns the DAO contract.
    /// @return IDAO The DAO contract.
    function dao() public view virtual returns (IDAO) {
        return _dao;
    }
}
