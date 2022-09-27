// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {DaoAuthorizable} from "../component/DaoAuthorizable.sol";
import {IDAO} from "../IDAO.sol";
import {Plugin} from "./Plugin.sol";

/// TODO, do we need this class as it doesn't differ from Plugin?
/// @title PluginClones
/// @notice An abstract contract to inherit from when creating a proxy contract.
/// This should be used to deploy EIP-1167 clones.
abstract contract PluginClones is Plugin {
    bytes4 public constant PLUGIN_CLONES_INTERFACE_ID = type(PluginClones).interfaceId;

    function __PluginClones_init(IDAO _dao) internal virtual onlyInitializing {
        __Plugin_init(_dao);
    }

    /* // Alternative if `Plugin` uses a constructor instead of `__Plugin_init`
    function __PluginClones_init(IDAO _dao) internal virtual onlyInitializing {
        __DaoAuthorizable_init(_dao);
    } */

    /// @notice adds a IERC165 to check whether contract supports PluginClones interface or not.
    /// @dev See {ERC165-supportsInterface}.
    /// @return bool whether it supports the IERC165 or PluginClones
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == PLUGIN_CLONES_INTERFACE_ID || super.supportsInterface(interfaceId);
    }
}
