// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

/// @title IPlugin
/// @author Aragon Association - 2022-2023
/// @notice An interface defining the traits of a plugin.
interface IPlugin {
    enum PluginType {
        UUPS,
        Cloneable,
        Constructable
    }

    /// @notice returns the plugin's type
    function pluginType() external view returns (PluginType);
}
