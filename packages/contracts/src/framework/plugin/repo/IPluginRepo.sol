// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

/// @title IPluginRepo
/// @author Aragon Association - 2022-2023
/// @notice The interface required for a plugin repository.
/// @custom:security-contact sirt@aragon.org
interface IPluginRepo {
    /// @notice The struct describing the tag of a version obtained by a release and build number as `RELEASE.BUILD`.
    /// @param release The release number.
    /// @param build The build number
    /// @dev Releases mark incompatible changes (e.g., the plugin interface, storage layout, or incompatible behavior) whereas builds mark compatible changes (e.g., patches and compatible feature additions).
    struct Tag {
        uint8 release;
        uint16 build;
    }

    /// @notice The struct describing a plugin version (release and build).
    /// @param tag The version tag.
    /// @param pluginSetup The setup contract associated with this version.
    /// @param buildMetadata The build metadata URI.
    struct Version {
        Tag tag;
        address pluginSetup;
        bytes buildMetadata;
    }

    /// @notice Updates the metadata for release with content `@fromHex(_releaseMetadata)`.
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

    /// @notice Used for setting the initial version of a plugin repo to a specific release and build number. Can only be used if no prior versions exist.
    /// @param _release The release number.
    /// @param _build The build number.
    /// @param _pluginSetup The address of the plugin setup contract.
    /// @param _buildMetadata The build metadata URI.
    /// @param _releaseMetadata The release metadata URI.
    function createInitialVersion(
        uint8 _release,
        uint16 _build,
        address _pluginSetup,
        bytes calldata _buildMetadata,
        bytes calldata _releaseMetadata
    ) external;

    /// @notice Returns the latest version for a given release number.
    /// @param _release The release number.
    /// @return The latest version of this release.
    function getLatestVersion(uint8 _release) external view returns (Version memory);

    /// @notice Returns the latest version for a given plugin setup.
    /// @param _pluginSetup The plugin setup address
    /// @return The latest version associated with the plugin Setup.
    function getLatestVersion(address _pluginSetup) external view returns (Version memory);

    /// @notice Returns the version associated with a tag.
    /// @param _tag The version tag.
    /// @return The version associated with the tag.
    function getVersion(Tag calldata _tag) external view returns (Version memory);

    /// @notice Returns the version for a tag hash.
    /// @param _tagHash The tag hash.
    /// @return The version associated with a tag hash.
    function getVersion(bytes32 _tagHash) external view returns (Version memory);

    /// @notice Gets the total number of builds for a given release number.
    /// @param _release The release number.
    /// @return The number of builds of this release.
    function buildCount(uint8 _release) external view returns (uint256);

    /// @notice Thrown if the same plugin setup exists in previous releases.
    /// @param release The release number.
    /// @param build The build number.
    /// @param pluginSetup The address of the plugin setup contract.
    /// @param buildMetadata The build metadata URI.
    event VersionCreated(
        uint8 release,
        uint16 build,
        address indexed pluginSetup,
        bytes buildMetadata
    );

    /// @notice Thrown when a release's metadata was updated.
    /// @param release The release number.
    /// @param releaseMetadata The release metadata URI.
    event ReleaseMetadataUpdated(uint8 release, bytes releaseMetadata);
}
