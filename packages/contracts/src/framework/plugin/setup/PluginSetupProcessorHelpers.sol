// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
import {PluginRepo} from "../repo/PluginRepo.sol";
import {PluginSetup} from "./PluginSetup.sol";

/// @notice The struct containin a reference to a plugin setup by specifying the containing plugin repository and the associated version tag.
/// @param versionTag The tag associated with the plugin setup version.
/// @param pluginSetupRepo The plugin setup repository.
struct PluginSetupRef {
    PluginRepo.Tag versionTag;
    PluginRepo pluginSetupRepo;
}

/// @notice The different types describing a prepared setup.
/// @param None The default indicating the lack of a preparation type.
/// @param Installation The prepared setup installs a new plugin.
/// @param Update The prepared setup updates an existing plugin.
/// @param Uninstallation The prepared setup uninstalls an existing plugin.
enum PreparationType {
    None,
    Installation,
    Update,
    Uninstallation
}

/// @notice Returns an ID for plugin installation by hashing the DAO and plugin address.
/// @param _dao The address of the DAO conducting the setup.
/// @param _plugin The plugin address.
function _getPluginInstallationId(address _dao, address _plugin) pure returns (bytes32) {
    return keccak256(abi.encode(_dao, _plugin));
}

/// @notice Returns an ID for prepared setup obtained from hashing characterizing elements.
/// @param _pluginSetupRef The reference of the plugin setup containing plugin setup repo and version tag.
/// @param _permissionsHash The hash of the permission operations requested by the setup.
/// @param _helpersHash The hash of the helper contract addresses.
/// @param _data The bytes-encoded initialize data for the upgrade that is returned by `prepareUpdate`.
/// @param _preparationType The type of preparation the plugin is currently undergoing. Without this, it is possible to call `applyUpdate` even after `applyInstallation` is called.
/// @return The prepared setup id.
function _getPreparedSetupId(
    PluginSetupRef memory _pluginSetupRef,
    bytes32 _permissionsHash,
    bytes32 _helpersHash,
    bytes memory _data,
    PreparationType _preparationType
) pure returns (bytes32) {
    return
        keccak256(
            abi.encode(
                _pluginSetupRef.versionTag,
                _pluginSetupRef.pluginSetupRepo,
                _permissionsHash,
                _helpersHash,
                keccak256(_data),
                _preparationType
            )
        );
}

/// @notice Returns an identifier for applied installations.
/// @param _pluginSetupRef The reference of the plugin setup containing plugin setup repo and version tag.
/// @param _helpersHash The hash of the helper contract addresses.
/// @return The applied setup id.
function _getAppliedSetupId(
    PluginSetupRef memory _pluginSetupRef,
    bytes32 _helpersHash
) pure returns (bytes32) {
    return
        keccak256(
            abi.encode(_pluginSetupRef.versionTag, _pluginSetupRef.pluginSetupRepo, _helpersHash)
        );
}

/// @notice Returns a hash of an array of helper addresses (contracts or EOAs).
/// @param _helpers The array of helper addresses (contracts or EOAs) to be hashed.
function hashHelpers(address[] memory _helpers) pure returns (bytes32) {
    return keccak256(abi.encode(_helpers));
}

/// @notice Returns a hash of an array of multi-targeted permission operations.
/// @param _permissions The array of of multi-targeted permission operations.
/// @return The hash of the array of permission operations.
function hashPermissions(
    PermissionLib.MultiTargetPermission[] memory _permissions
) pure returns (bytes32) {
    return keccak256(abi.encode(_permissions));
}
