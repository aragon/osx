// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

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
function _getPluginId(address _dao, address _plugin) pure returns (bytes32) {
    return keccak256(abi.encode(_dao, _plugin));
}

/// @notice Returns an identifier for prepared installations by hashing the DAO and plugin address.
/// @param _pluginSetupRef The reference of the plugin setup containing plugin setup repo and version tag.
/// @param _permissionHash The hash of the permission objects.
/// @param _helperHash The hash of the helper contract addresses.
/// @param _data data that is passed by the user or wdd.. GIORGI
/// @param _preparationType Tells which PreparationType the plugin is in currently. Without this, it's possible to call applyUpdate even after applyInstallation is called.
function _getSetupId(
    PluginSetupRef memory _pluginSetupRef,
    bytes32 _permissionHash,
    bytes32 _helperHash,
    bytes32 _actionsHash,
    bytes memory _data,
    PreparationType _preparationType
) pure returns (bytes32) {
    return
        keccak256(
            abi.encode(
                _pluginSetupRef.versionTag,
                _pluginSetupRef.pluginSetupRepo,
                _permissionHash,
                _helperHash,
                _actionsHash,
                keccak256(_data),
                _preparationType
            )
        );
}

/// @notice Returns a hash of an array of helper addresses (contracts or EOAs).
/// @param _helpers The array of helper addresses (contracts or EOAs) to be hashed.
function hHash(address[] memory _helpers) pure returns (bytes32) {
    return keccak256(abi.encode(_helpers));
}

/// @notice Returns a hash of an array of multi-targeted permission operations.
/// @param _permissions The array of of multi-targeted permission operations.
/// @return bytes The hash of the array of permission operations.
function pHash(PermissionLib.ItemMultiTarget[] memory _permissions) pure returns (bytes32) {
    return keccak256(abi.encode(_permissions));
}

/// @notice Returns a hash of an array of IDAO.Action;
/// @param _actions The array of Actions
/// @return bytes The hash of the array of Actions;
function aHash(IDAO.Action[] memory _actions) pure returns (bytes32) {
    return keccak256(abi.encode(_actions));
}

