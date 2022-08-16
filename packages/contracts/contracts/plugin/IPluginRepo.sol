/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

/// @title The interface required for a plugin pluginRepo
/// @author Aragon Association - 2022
interface IPluginRepo {
    /// @notice Create new version with contract `_pluginManagerAddress` and content `@fromHex(_contentURI)`
    /// @param _newSemanticVersion Semantic version for new pluginRepo version
    /// @param _pluginManagerAddress Address for smart contract logic for version (if set to 0, it uses last versions' pluginManagerAddress)
    /// @param _contentURI External URI where the plugin metadata and subsequent resources can be fetched from
    function createVersion(
        uint16[3] memory _newSemanticVersion,
        address _pluginManagerAddress,
        bytes calldata _contentURI
    ) external;
}
