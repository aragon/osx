// SPDX-License-Identifier:    MIT

pragma solidity 0.8.10;

/// @title IPluginRepo
/// @author Aragon Association - 2022
/// @notice The interface required for a plugin repository.
interface IPluginRepo {
    function createVersion(
        uint8 _releaseId,
        address _pluginSetupAddress,
        bytes calldata _contentURI
    ) external;
}
