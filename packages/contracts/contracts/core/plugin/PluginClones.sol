// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {PermissionManager} from "../permission/PermissionManager.sol";

import {IDAO} from "../IDAO.sol";
import {DaoAuthorizable} from "../component/DaoAuthorizable.sol";

/// @title PluginClones
/// @notice An abstract contract to inherit from when creating a proxy contract.
/// This should be used to deploy EIP-1167 clones.
abstract contract PluginClones is Initializable, ERC165, DaoAuthorizable {
    bytes4 public constant PLUGIN_CLONES_INTERFACE_ID = type(PluginClones).interfaceId;

    function __Plugin_init(address _dao) internal virtual onlyInitializing {
        __DaoAuthorizable_init(IDAO(_dao));
    }

    /// @notice adds a IERC165 to check whether contract supports PluginClones interface or not.
    /// @dev See {ERC165Upgradeable-supportsInterface}.
    /// @return bool whether it supports the IERC165 or PluginClones
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == PLUGIN_CLONES_INTERFACE_ID || super.supportsInterface(interfaceId);
    }
}
