// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

/// @title IPlugin
/// @author Aragon X - 2022-2024
/// @notice An interface defining the traits of a plugin.
/// @custom:security-contact sirt@aragon.org
interface IPlugin {
    /// @notice Types of plugin implementations available within OSx.
    enum PluginType {
        UUPS,
        Cloneable,
        Constructable
    }

    /// @notice Specifies the type of operation to perform.
    enum Operation {
        Call,
        DelegateCall
    }

    /// @notice Configuration for the target contract that the plugin will interact with, including the address and operation type.
    /// @dev By default, the plugin typically targets the associated DAO and performs a `Call` operation. However, this
    ///      configuration allows the plugin to specify a custom executor and select either `Call` or `DelegateCall` based on
    ///      the desired execution context.
    /// @param target The address of the target contract, typically the associated DAO but configurable to a custom executor.
    /// @param operation The type of operation (`Call` or `DelegateCall`) to execute on the target, as defined by `Operation`.
    struct TargetConfig {
        address target;
        Operation operation;
    }

    /// @notice Returns the plugin's type
    function pluginType() external view returns (PluginType);
}
