// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {DaoAuthorizableCloneable} from "../component/dao-authorizable/DaoAuthorizableCloneable.sol";
import {IDAO} from "../IDAO.sol";
import {IPlugin} from "./IPlugin.sol";

/// @title PluginCloneable
/// @author Aragon Association - 2022
/// @notice An abstract, non-upgradeable contract to inherit from when creating a plugin being deployed via the minimal clones pattern (see [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167)).
abstract contract PluginCloneable is IPlugin, DaoAuthorizableCloneable, ERC165 {
    /// @notice Initializes the plugin by storing the associated DAO.
    /// @param _dao The DAO contract.
    function __PluginCloneable_init(IDAO _dao) internal virtual onlyInitializing {
        __DaoAuthorizableCloneable_init(_dao);
    }

    /// @inheritdoc IPlugin
    function pluginType() public pure override returns (PluginType) {
        return PluginType.Cloneable;
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interace.
    /// @return bool Returns true if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return _interfaceId == type(IPlugin).interfaceId || super.supportsInterface(_interfaceId);
    }
}
