// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import {_auth} from "../../utils/auth.sol";
import {IDAO} from "../IDAO.sol";

/// @title DaoAuthorizableCloneable
/// @author Aragon Association - 2022
/// @notice An abstract contract providing a meta transaction compatible modifier to authorize function calls through an associated DAO.
/// This contract provides an `auth` modifier that can be applied to functions in inheriting contracts. The permission to call these functions is managed by the associated DAO.
/// @dev Make sure to call `__DaoAuthorizableCloneable_init` during initialization of the inheriting contract.
///      This contract is compatible with meta transactions through OZ's `Context`.
abstract contract DaoAuthorizableCloneable is Initializable, Context {
    /// @notice The associated DAO managing the permissions of inheriting contracts.
    IDAO internal dao;

    /// @notice Initializes the contract by setting the associated DAO.
    /// @param _dao The associated DAO address.
    function __DaoAuthorizableCloneable_init(IDAO _dao) internal onlyInitializing {
        dao = _dao;
    }

    /// @notice Returns the DAO contract.
    /// @return IDAO The DAO contract.
    function getDAO() external view returns (IDAO) {
        return dao;
    }

    /// @notice A modifier to be used to check permissions on a target contract via the associated DAO.
    /// @param _permissionId The permission identifier required to call the method this modifier is applied to.
    modifier auth(bytes32 _permissionId) {
        _auth(dao, address(this), _msgSender(), _permissionId, _msgData());
        _;
    }
}
