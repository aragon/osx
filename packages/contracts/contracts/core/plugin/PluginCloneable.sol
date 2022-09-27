// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {DaoAuthorizableCloneable} from "../component/DaoAuthorizableCloneable.sol";
import {IDAO} from "../IDAO.sol";
import {Plugin} from "./Plugin.sol";

/// TODO, do we need this class as it doesn't differ from Plugin?
/// @title PluginCloneable
/// @notice An abstract contract to inherit from when creating a proxy contract.
/// This should be used to deploy EIP-1167 clones.
abstract contract PluginCloneable is ERC165, DaoAuthorizableCloneable {
    bytes4 public constant PLUGIN_CLONES_INTERFACE_ID = type(PluginCloneable).interfaceId;

    function __PluginCloneable_init(IDAO _dao) internal virtual onlyInitializing {
        __DaoAuthorizableCloneable_init(_dao);
    }

    /// @notice adds a IERC165 to check whether contract supports PluginCloneable interface or not.
    /// @dev See {ERC165-supportsInterface}.
    /// @return bool whether it supports the IERC165 or PluginCloneable
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == PLUGIN_CLONES_INTERFACE_ID || super.supportsInterface(interfaceId);
    }
}
