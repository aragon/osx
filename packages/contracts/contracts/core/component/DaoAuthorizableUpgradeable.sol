// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

import {IDAO} from "../IDAO.sol";
import {DaoAuthorizableBase} from "./DaoAuthorizableBase.sol";

/// @title DaoAuthorizableUpgradeable
/// @author Aragon Association - 2022
/// @notice An abstract contract providing a meta-transaction compatible modifier for upgradeable contracts to authorize function calls through an associated DAO.
/// @dev Make sure to call `__DaoAuthorizableUpgradeable_init` during initialization of the inheriting contract.
abstract contract DaoAuthorizableUpgradeable is
    DaoAuthorizableBase,
    Initializable,
    ContextUpgradeable
{
    /// @notice Initializes the contract by setting the associated DAO.
    /// @param _dao The associated DAO address.
    function __DaoAuthorizableUpgradeable_init(IDAO _dao) internal onlyInitializing {
        dao = _dao;
    }

    /// @inheritdoc ContextUpgradeable
    function _msgSender()
        internal
        view
        virtual
        override(Context, ContextUpgradeable)
        returns (address)
    {
        return ContextUpgradeable._msgSender();
    }

    /// @inheritdoc ContextUpgradeable
    function _msgData()
        internal
        view
        virtual
        override(Context, ContextUpgradeable)
        returns (bytes calldata)
    {
        return ContextUpgradeable._msgData();
    }

    /// @dev This empty reserved space is put in place to allow future versions to add new
    /// variables without shifting down storage in the inheritance chain.
    /// https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    uint256[49] private __gap;
}
