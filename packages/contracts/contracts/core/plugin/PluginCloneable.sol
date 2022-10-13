// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {DaoAuthorizableCloneable} from "../component/DaoAuthorizableCloneable.sol";
import {IDAO} from "../IDAO.sol";
import {Plugin} from "./Plugin.sol";

/// @title PluginCloneable
/// @author Aragon Association - 2022
/// @notice An abstract, non-upgradeable contract to inherit from when creating a plugin being deployed via the minimal clones pattern (see [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167)).
abstract contract PluginCloneable is ERC165, DaoAuthorizableCloneable {
    bytes4 public constant PLUGIN_CLONEABLE_INTERFACE_ID = type(PluginCloneable).interfaceId;

    /// @notice Initializes the plugin by storing the associated DAO.
    /// @param _dao The DAO contract.
    function __PluginCloneable_init(IDAO _dao) internal virtual onlyInitializing {
        __DaoAuthorizableCloneable_init(_dao);
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interace.
    /// @return bool Returns true if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == PLUGIN_CLONEABLE_INTERFACE_ID || super.supportsInterface(_interfaceId);
    }
}
