// SPDX-License-Identifier:    MIT

pragma solidity 0.8.10;

/// @title IPluginRepo
/// @author Aragon Association - 2022
/// @notice The interface required for a plugin repository.
interface IPluginRepo {
    struct Metadata {
        bytes releaseMetadata; // The metadata URI of the release
        bytes buildMetadata; // The metadata URI of the build
    }

    /// @notice Creates a new version with contract `_pluginSetupAddress` and content `@fromHex(_contentURI)`.
    /// @param _release the release number.
    /// @param _pluginSetupAddress The address of the plugin setup contract.
    /// @param _metadata External URI where the plugin metadata and subsequent resources can be fetched from
    function createVersion(
        uint8 _release,
        address _pluginSetupAddress,
        Metadata calldata _metadata
    ) external;
}
