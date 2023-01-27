// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import {IDAO} from "../../IDAO.sol";
import {DaoAuthorizableBase} from "./DaoAuthorizableBase.sol";

/// @title DaoAuthorizable
/// @author Aragon Association - 2022-2023
/// @notice An abstract contract providing a meta transaction compatible modifier for constructable contracts instantiated via the `new` keyword to authorize function calls through an associated DAO.
abstract contract DaoAuthorizable is DaoAuthorizableBase {
    /// @notice Constructs the contract by setting the associated DAO.
    /// @param _dao The associated DAO address.
    constructor(IDAO _dao) {
        dao = _dao;
    }
}
