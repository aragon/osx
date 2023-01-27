// SPDX-License-Identifier:    MIT

pragma solidity 0.8.17;

/// @title IPluginRepo
/// @author Aragon Association - 2022
/// @notice The interface required for a plugin repository.
interface IPluginRepo {
    /// @notice Creates a new version with contract `_pluginSetupAddress` and content `@fromHex(_contentURI)`.
    /// @param _release the release number.
    /// @param _pluginSetupAddress The address of the plugin setup contract.
    /// @param _contentURI External URI where the plugin metadata and subsequent resources can be fetched from
    function createVersion(
        uint8 _release,
        address _pluginSetupAddress,
        bytes calldata _contentURI
    ) external;
}
