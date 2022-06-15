/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

/// @title The interface required for a plugin repo
/// @author Sarkawt Noori - Aragon Association - 2022
interface IRepo {
    /// @notice Create new version with contract `_pluginFactoryAddress` and content `@fromHex(_contentURI)`
    /// @param _newSemanticVersion Semantic version for new repo version
    /// @param _pluginFactoryAddress Address for smart contract logic for version (if set to 0, it uses last versions' pluginFactoryAddress)
    /// @param _contentURI External URI for fetching new version's content
    function newVersion(
        uint16[3] memory _newSemanticVersion,
        address _pluginFactoryAddress,
        bytes calldata _contentURI
    ) external;
}
