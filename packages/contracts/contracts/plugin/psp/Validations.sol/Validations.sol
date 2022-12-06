// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginRepo} from "../../PluginRepo.sol";
import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
import {PluginSetup} from "../../PluginSetup.sol";

function validateStateForPrepareUninstall(
    address _dao,
    address _plugin, 
    PluginSetupRef _pluginSetupRef, 
    ApplyUninstallParams calldata _params
) returns (bytes32 setupId, PluginInformation storage pluginInformation) {
    setupId = _getSetupId(
        _dao,
        _pluginSetupRef
        _params.plugin
    );

    pluginInformation = states[setupId];
    
    if(pluginInformation.state != State.UninstallPrepared) {
        revert PluginInWrongState();
    }

    if(pluginInformation.permissionsHash != _getPermissionsHash(_params.permissions)) {
        revert PermissionsHashMismatch();
    }
}