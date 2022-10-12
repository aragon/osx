// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {DaoAuthorizableCloneable} from "../component/DaoAuthorizableCloneable.sol";
import {IDAO} from "../IDAO.sol";
import {Plugin} from "./Plugin.sol";

/// @title PluginCloneable
/// @notice An abstract, non-upgradeable contract to inherit from when creating a plugin being deployed via the minimal clones pattern (see [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167)).
abstract contract PluginCloneable is ERC165, DaoAuthorizableCloneable {
    bytes4 public constant PLUGIN_CLONES_INTERFACE_ID = type(PluginCloneable).interfaceId;

    function __PluginCloneable_init(IDAO _dao) internal virtual onlyInitializing {
        __DaoAuthorizableCloneable_init(_dao);
    }

    /// @inheritdoc ERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == PLUGIN_CLONES_INTERFACE_ID || super.supportsInterface(interfaceId);
    }
}
