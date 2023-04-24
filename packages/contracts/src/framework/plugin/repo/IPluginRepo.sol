// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

/// @title IPluginRepo
/// @author Aragon Association - 2022-2023
/// @notice The interface required for a plugin repository.
interface IPluginRepo {
    /// @notice Update the metadata for release with content `@fromHex(_releaseMetadata)`.
    /// @param _release The release number.
    /// @param _releaseMetadata The release metadata URI.
    function updateReleaseMetadata(uint8 _release, bytes calldata _releaseMetadata) external;

    /// @notice Creates a new plugin version as the latest build for an existing release number or the first build for a new release number for the provided `PluginSetup` contract address and metadata.
    /// @param _release The release number.
    /// @param _pluginSetupAddress The address of the plugin setup contract.
    /// @param _buildMetadata The build metadata URI.
    /// @param _releaseMetadata The release metadata URI.
    function createVersion(
        uint8 _release,
        address _pluginSetupAddress,
        bytes calldata _buildMetadata,
        bytes calldata _releaseMetadata
    ) external;
}
