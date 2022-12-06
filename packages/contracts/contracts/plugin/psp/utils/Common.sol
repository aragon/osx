// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginRepo} from "../../PluginRepo.sol";
import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
import {PluginSetup} from "../../PluginSetup.sol";

/// @notice Returns an identifier for prepared installations by hashing the DAO and plugin address.
/// @param _dao The address of the DAO conducting the setup.
/// @param _versionTag The exact version of the plugin to install.
/// @param _pluginSetupRepo The address of plugin setup repo.
/// @param _plugin The address of the `Plugin` contract associated with the setup.
function _getSetupId(
    address _dao,
    PluginRepo.Tag calldata _versionTag,
    address _pluginSetupRepo,
    address _plugin
) returns (bytes32 setupId) {
    setupId = keccak256(abi.encode(_dao, _versionTag, _pluginSetupRepo, _plugin));
}

/// @notice Returns a hash of an array of helper addresses (contracts or EOAs).
/// @param _helpers The array of helper addresses (contracts or EOAs) to be hashed.
function _getHelpersHash(address[] memory _helpers) returns (bytes32 helpersHash) {
    helpersHash = keccak256(abi.encode(_helpers));
}

/// @notice Returns an identifier for applied installations by hashing the DAO and plugin address.
/// @param _dao The address of the DAO conducting the setup.
/// @param _plugin The address of the `Plugin` contract associated with the setup.
function _getAppliedId(address _dao, address _plugin) pure returns (bytes32 appliedId) {
    appliedId = keccak256(abi.encode(_dao, _plugin));
}

/// @notice Returns a hash of an array of multi-targeted permission operations.
/// @param _permissions The array of of multi-targeted permission operations.
/// @return bytes The hash of the array of permission operations.
function _getPermissionsHash(PermissionLib.ItemMultiTarget[] memory _permissions)
    returns (bytes32)
{
    return keccak256(abi.encode(_permissions));
}
