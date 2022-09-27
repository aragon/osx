// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import {DaoAuthorizableUpgradeable} from "../component/DaoAuthorizableUpgradeable.sol";
import {IDAO} from "../IDAO.sol";

/// @title PluginUpgradeable
/// @notice An abstract, upgradeable contract to inherit from when creating a plugin being deployed via the transparent proxy pattern (see [OZ's article](https://blog.openzeppelin.com/the-transparent-proxy-pattern/)).
abstract contract PluginUpgradeable is ERC165Upgradeable, DaoAuthorizableUpgradeable {
    bytes4 public constant PLUGIN_INTERFACE_ID = type(PluginUpgradeable).interfaceId;

    function __PluginUpgradeable_init(IDAO _dao) internal virtual onlyInitializing {
        __DaoAuthorizableUpgradeable_init(_dao);
    }

    /// @notice adds a IERC165 to check whether contract supports PluginUpgradeable interface or not.
    /// @dev See {ERC165Upgradeable-supportsInterface}.
    /// @return bool whether it supports the IERC165 or PluginUpgradeable
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == PLUGIN_INTERFACE_ID || super.supportsInterface(interfaceId);
    }

    /// @dev This empty reserved space is put in place to allow future versions to add new
    /// variables without shifting down storage in the inheritance chain.
    /// https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    uint256[50] private __gap;
}
