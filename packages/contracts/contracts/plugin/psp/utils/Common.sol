// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginRepo} from "../../PluginRepo.sol";
import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
import {PluginSetup} from "../../PluginSetup.sol";

struct PluginSetupRef {
    PluginRepo.Tag versionTag;
    PluginRepo pluginSetupRepo;
}

/// @notice Returns an identifier for the plugin id.
/// @param _dao The address of the DAO conducting the setup.
/// @param _plugin The plugin address
function _getPluginId(address _dao, address _plugin) returns (bytes32) {
    return keccak256(abi.encode(_dao, _plugin));
}

/// @notice Returns an identifier for prepared installations by hashing the DAO and plugin address.
/// @param _pluginSetupRef The reference of the plugin setup containing plugin setup repo and version tag.
/// @param _permissionHash The hash of the permission objects.
/// @param _helperHash The hash of the helper contract addresses.
/// @param _data data that is passed by the user or wdd.. GIORGI
function _getSetupId(
    PluginSetupRef calldata _pluginSetupRef,
    bytes32 _permissionHash,
    bytes32 _helperHash,
    bytes memory _data
) returns (bytes32) {
    return
        keccak256(
            abi.encode(
                _pluginSetupRef.versionTag,
                _pluginSetupRef.pluginSetupRepo,
                _permissionHash,
                _helperHash,
                keccak256(_data)
            )
        );
}

/// @notice Returns a hash of an array of helper addresses (contracts or EOAs).
/// @param _helpers The array of helper addresses (contracts or EOAs) to be hashed.
function hHash(address[] memory _helpers) returns (bytes32) {
    return keccak256(abi.encode(_helpers));
}

/// @notice Returns a hash of an array of multi-targeted permission operations.
/// @param _permissions The array of of multi-targeted permission operations.
/// @return bytes The hash of the array of permission operations.
function pHash(PermissionLib.ItemMultiTarget[] memory _permissions) returns (bytes32) {
    return keccak256(abi.encode(_permissions));
}
