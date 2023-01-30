// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import {PluginRepo} from "../../PluginRepo.sol";
import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
import {PluginSetup} from "../../PluginSetup.sol";
import {IPluginSetup} from "../../IPluginSetup.sol";

import {IDAO} from "../../../core/IDAO.sol";

struct PluginSetupRef {
    PluginRepo.Tag versionTag;
    PluginRepo pluginSetupRepo;
}

enum PreparationType {
    None,
    Install,
    Update,
    Uninstall
}

/// @notice Returns an identifier for the plugin id.
/// @param _dao The address of the DAO conducting the setup.
/// @param _plugin The plugin address
function _getPluginInstallationId(address _dao, address _plugin) pure returns (bytes32) {
    return keccak256(abi.encode(_dao, _plugin));
}

/// @notice Returns an identifier for prepared installations by hashing the DAO and plugin address.
/// @param _pluginSetupRef The reference of the plugin setup containing plugin setup repo and version tag.
/// @param _permissionHash The hash of the permission objects.
/// @param _helpersHash The hash of the helper contract addresses.
/// @param _data Encoded initialize data for the upgrade that is returned by the `prepareUpdate`.
/// @param _preparationType Tells which PreparationType the plugin is in currently. Without this, it's possible to call applyUpdate even after applyInstallation is called.
/// @return bytes32 The prepared setup id.
function _getPreparedSetupId(
    PluginSetupRef memory _pluginSetupRef,
    bytes32 _permissionHash,
    bytes32 _helpersHash,
    bytes memory _data,
    PreparationType _preparationType
) pure returns (bytes32) {
    return
        keccak256(
            abi.encode(
                _pluginSetupRef.versionTag,
                _pluginSetupRef.pluginSetupRepo,
                _permissionHash,
                _helpersHash,
                keccak256(_data),
                _preparationType
            )
        );
}

/// @notice Returns an identifier for applied installations.
/// @param _pluginSetupRef The reference of the plugin setup containing plugin setup repo and version tag.
/// @param _helpersHash The hash of the helper contract addresses.
/// @return bytes32 The applied setup id.
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
/// @return bytes The hash of the array of permission operations.
function hashPermissions(
    PermissionLib.MultiTargetPermission[] memory _permissions
) pure returns (bytes32) {
    return keccak256(abi.encode(_permissions));
}
