// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

/// @title IPluginRepo
/// @author Aragon Association - 2022-2023
/// @notice The interface required for a plugin repository.
interface IPluginRepo {
    /// @notice Creates a new version with contract `_pluginSetupAddress` and content `@fromHex(_contentURI)`.
    /// @param _release The release ID.
    /// @param _pluginSetupAddress The address of the plugin setup contract.
    /// @param _contentURI The URI containing the plugin UI components and related information.
    function createVersion(
        uint8 _release,
        address _pluginSetupAddress,
        bytes calldata _contentURI
    ) external;
}
