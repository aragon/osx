// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

import {_auth} from "../../utils/auth.sol";

import {IDAO} from "./../IDAO.sol";

/// @title DaoAuthorizableUpgradeable
/// @author Aragon Association - 2022
/// @notice An abstract contract providing a meta-transaction compatible modifier to authorize function calls through an associated DAO.
abstract contract DaoAuthorizableUpgradeable is Initializable, ContextUpgradeable {
    /// @notice The associated DAO managing the permissions of inheriting contracts.
    IDAO internal dao;

    /// @notice Initializes the contract by setting the associated DAO.
    /// @param _dao The associated DAO address.
    function __DaoAuthorizable_init(IDAO _dao) internal virtual onlyInitializing {
        dao = _dao;
    }

    /// @notice Returns the DAO that was set at the moment of creation or initialization.
    /// @return The DAO contract.
    function getDAO() external view returns (IDAO) {
        return dao;
    }

    /// @notice A modifier to be used to check permissions on a target contract via the associated DAO.
    /// @param _permissionId The permission identifier required to call the method this modifier is applied to.
    modifier auth(bytes32 _permissionId) {
        _auth(dao, address(this), _msgSender(), _permissionId, _msgData());
        _;
    }

    /// @dev This empty reserved space is put in place to allow future versions to add new
    /// variables without shifting down storage in the inheritance chain.
    /// https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    uint256[49] private __gap;
}
