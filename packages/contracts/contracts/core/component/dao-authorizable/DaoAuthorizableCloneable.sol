// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

import {IDAO} from "../../IDAO.sol";
import {_auth} from "../../../utils/auth.sol";

/// @title DaoAuthorizableCloneable
/// @author Aragon Association - 2022
/// @notice An abstract contract providing a meta-transaction compatible modifier for clonable contracts to authorize function calls through an associated DAO.
/// @dev Make sure to call `__DaoAuthorizableCloneable_init` during initialization of the inheriting contract.
///      This contract is compatible with meta transactions through OZ's `Context`.
abstract contract DaoAuthorizableCloneable is Initializable, ContextUpgradeable {
    /// @notice The associated DAO managing the permissions of inheriting contracts.
    IDAO private _dao;

    /// @notice A modifier to be used to check permissions on a target contract via the associated DAO.
    /// @param _permissionId The permission identifier required to call the method this modifier is applied to.
    modifier auth(bytes32 _permissionId) {
        _auth(_dao, address(this), _msgSender(), _permissionId, _msgData());
        _;
    }

    /// @notice Initializes the contract by setting the associated DAO.
    /// @param dao_ The associated DAO address.
    function __DaoAuthorizableCloneable_init(IDAO dao_) internal onlyInitializing {
        _dao = dao_;
    }

    /// @notice Returns the DAO contract.
    /// @return IDAO The DAO contract.
    function dao() public view virtual returns (IDAO) {
        return _dao;
    }
}
