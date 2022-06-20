/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

/// @title The interface required for a plugin pluginRepo
/// @author Sarkawt Noori - Aragon Association - 2022
interface IPluginRepo {
    /// @notice Create new version with contract `_pluginFactoryAddress` and content `@fromHex(_contentURI)`
    /// @param _newSemanticVersion Semantic version for new pluginRepo version
    /// @param _pluginFactoryAddress Address for smart contract logic for version (if set to 0, it uses last versions' pluginFactoryAddress)
    /// @param _contentURI External URI for fetching new version's content
    function newVersion(
        uint16[3] memory _newSemanticVersion,
        address _pluginFactoryAddress,
        bytes calldata _contentURI
    ) external;
}
