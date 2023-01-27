// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {DaoAuthorizable} from "../component/dao-authorizable/DaoAuthorizable.sol";
import {IDAO} from "../IDAO.sol";
import {IPlugin} from "./IPlugin.sol";

/// @title Plugin
/// @author Aragon Association - 2022
/// @notice An abstract, non-upgradeable inherit from when creating a plugin being deployed via the `new` keyword.
abstract contract Plugin is IPlugin, ERC165, DaoAuthorizable {
    /// @notice Constructs the plugin by storing the associated DAO.
    /// @param _dao The DAO contract.
    constructor(IDAO _dao) DaoAuthorizable(_dao) {}

    /// @inheritdoc IPlugin
    function pluginType() public pure override returns (PluginType) {
        return PluginType.Constructable;
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interface.
    /// @return bool Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return _interfaceId == type(IPlugin).interfaceId || super.supportsInterface(_interfaceId);
    }
}
