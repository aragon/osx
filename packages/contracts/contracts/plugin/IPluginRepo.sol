// SPDX-License-Identifier:    MIT

pragma solidity 0.8.17;

/// @title IPluginRepo
/// @author Aragon Association - 2022
/// @notice The interface required for a plugin repository.
interface IPluginRepo {
    /// @notice Update the metadata for release with content `@fromHex(_releaseMetadata)`.
    /// @param _release The release number.
    /// @param _metadata External URI where the plugin's release metadata and subsequent resources can be fetched from.
    function updateReleaseMetadata(uint8 _release, bytes calldata _metadata) external;

    /// @notice Creates a new version with contract `_pluginSetupAddress` and content `@fromHex(_buildMetadata)`.
    /// @param _release the release number.
    /// @param _pluginSetupAddress The address of the plugin setup contract.
    /// @param _buildMetadata External URI where the plugin's build metadata and subsequent resources can be fetched from.
    /// @param _releaseMetadata External URI where the plugin's release metadata and subsequent resources can be fetched from.
    function createVersion(
        uint8 _release,
        address _pluginSetupAddress,
        bytes calldata _buildMetadata,
        bytes calldata _releaseMetadata
    ) external;
}
