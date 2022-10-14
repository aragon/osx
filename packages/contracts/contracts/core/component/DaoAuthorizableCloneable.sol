// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import {IDAO} from "../IDAO.sol";
import {DaoAuthorizableBase} from "./DaoAuthorizableBase.sol";

/// @title DaoAuthorizableCloneable
/// @author Aragon Association - 2022
/// @notice An abstract contract providing a meta-transaction compatible modifier for clonable contracts to authorize function calls through an associated DAO.
/// @dev Make sure to call `__DaoAuthorizableCloneable_init` during initialization of the inheriting contract.
///      This contract is compatible with meta transactions through OZ's `Context`.
abstract contract DaoAuthorizableCloneable is Initializable, DaoAuthorizableBase {
    /// @notice Initializes the contract by setting the associated DAO.
    /// @param _dao The associated DAO address.
    function __DaoAuthorizableCloneable_init(IDAO _dao) internal onlyInitializing {
        dao = _dao;
    }
}
