// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {DaoAuthorizable} from "../component/DaoAuthorizable.sol";
import {IDAO} from "../IDAO.sol";

/// @title Plugin
/// @notice NON-Upgradable Plugin Interface that should be directly deployed with `new`.
abstract contract Plugin is ERC165, DaoAuthorizable {
    bytes4 public constant PLUGIN_INTERFACE_ID = type(Plugin).interfaceId;

    constructor(IDAO _dao) DaoAuthorizable(_dao) {}

    /// @notice adds a IERC165 to check whether contract supports Plugin interface or not.
    /// @dev See {ERC165Upgradeable-supportsInterface}.
    /// @return bool whether it supports the IERC165 or Plugin
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == PLUGIN_INTERFACE_ID || super.supportsInterface(interfaceId);
    }
}
