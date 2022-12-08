// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginRepo} from "../../PluginRepo.sol";
import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
import {PluginSetup} from "../../PluginSetup.sol";


// function validateForApplyUpdate(
//     address _dao
//     ApplyUpdateParams calldata _params
// ) returns (bytes32 setupId, PluginInformation storage pluginInformation) {
//     setupId = _getSetupId(
//         _dao,
//         _params.pluginSetupRef
//         _params.plugin
//     );

//     pluginInformation = states[setupId];
    
//     if(
//         pluginInformation.state != State.InstallApplied && 
//         pluginInformation.state != State.UpdateApplied
//     ) {
//         revert PluginInWrongState();
//     }

//     if(pluginInformation.permissionsHash != _getPermissionsHash(_params.permissions)) {
//         revert PermissionsHashMismatch();
//     }
// }

// // Uninstall
// function validateForApplyUninstall(
//     address _dao
//     ApplyUninstallParams calldata _params
// ) returns (bytes32 setupId, PluginInformation storage pluginInformation) {
//     setupId = _getSetupId(
//         _dao,
//         _pluginSetupRef
//         _params.plugin
//     );

//     pluginInformation = states[setupId];
    
//     if(pluginInformation.state != State.UninstallPrepared) {
//         revert PluginInWrongState();
//     }

//     if(pluginInformation.permissionsHash != _getPermissionsHash(_params.permissions)) {
//         revert PermissionsHashMismatch();
//     }
// }

// function validateForPrepareUninstall(
//     address _dao
//     PrepareUninstallParams calldata _params
// ) returns (bytes32 setupId, PluginInformation storage pluginInformation) {
//     setupId = _getSetupId(
//         _dao,
//         _params.pluginSetupRef
//         _params.plugin
//     );

//     pluginInformation = states[setupId];
    
//     if(
//         pluginInformation.state != State.InstallApplied && 
//         pluginInformation.state != State.UpdateApplied
//     ) {
//         revert PluginInWrongState();
//     }

//     if(pluginInformation.helpersHash != _getHelpersHash(_params.currentHelpers)) {
//         revert HelpersHashMismatch();
//     }
// }