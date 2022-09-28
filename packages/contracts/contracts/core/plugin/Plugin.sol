// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/Context.sol";

import {_auth} from "../../utils/auth.sol";
import {AppStorage} from "../../utils/AppStorage.sol";

import {IDAO} from "../IDAO.sol";

/// @title Plugin
/// @notice NON-Upgradable Plugin Interface that should be directly deployed with `new`.
abstract contract Plugin is ERC165, Context, AppStorage {
    bytes4 public constant PLUGIN_INTERFACE_ID = type(Plugin).interfaceId;

    constructor(IDAO _dao) {
        setDAO(address(_dao));
    }

    /// @notice A modifier to be used to check permissions on a target contract via the associated DAO.
    /// @param _permissionId The permission identifier required to call the method this modifier is applied to.
    modifier auth(bytes32 _permissionId) {
        _auth(dao(), address(this), _msgSender(), _permissionId, _msgData());
        _;
    }

    /// @notice adds a IERC165 to check whether contract supports Plugin interface or not.
    /// @dev See {ERC165-supportsInterface}.
    /// @return bool whether it supports the IERC165 or Plugin
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == PLUGIN_INTERFACE_ID || super.supportsInterface(interfaceId);
    }
}
