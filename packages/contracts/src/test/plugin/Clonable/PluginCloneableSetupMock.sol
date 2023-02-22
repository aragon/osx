// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
import {IDAO} from "../../../core/dao/IDAO.sol";
import {PluginSetup} from "../../../framework/plugin/setup/PluginSetup.sol";
import {IPluginSetup} from "../../../framework/plugin/setup/IPluginSetup.sol";
import {mockPermissions, mockHelpers, mockPluginProxy} from "../PluginMockData.sol";
import {PluginCloneableV1Mock, PluginCloneableV1MockBad, PluginCloneableV2Mock} from "./PluginCloneableMock.sol";

contract PluginCloneableSetupV1Mock is PluginSetup {
    address internal pluginBase;

    constructor() {
        pluginBase = address(new PluginCloneableV1Mock());
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory
    ) public virtual override returns (address plugin, PreparedSetupData memory preparedSetupData) {
        plugin = mockPluginProxy(pluginBase, _dao);
        preparedSetupData.helpers = mockHelpers(1);
        preparedSetupData.permissions = mockPermissions(5, 6, PermissionLib.Operation.Grant);
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(
        address _dao,
        SetupPayload calldata _payload
    ) external virtual override returns (PermissionLib.MultiTargetPermission[] memory permissions) {
        (_dao, _payload);
        permissions = mockPermissions(5, 6, PermissionLib.Operation.Revoke);
    }

    /// @inheritdoc IPluginSetup
    function implementation() external view virtual override returns (address) {
        return address(pluginBase);
    }
}

contract PluginCloneableSetupV1MockBad is PluginCloneableSetupV1Mock {
    constructor() {
        pluginBase = address(new PluginCloneableV1MockBad());
    }
}

contract PluginCloneableSetupV2Mock is PluginCloneableSetupV1Mock {
    constructor() {
        pluginBase = address(new PluginCloneableV2Mock());
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory
    ) public virtual override returns (address plugin, PreparedSetupData memory preparedSetupData) {
        plugin = mockPluginProxy(pluginBase, _dao);
        preparedSetupData.helpers = mockHelpers(1);
        preparedSetupData.permissions = mockPermissions(5, 7, PermissionLib.Operation.Grant);
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(
        address _dao,
        SetupPayload calldata _payload
    ) external virtual override returns (PermissionLib.MultiTargetPermission[] memory permissions) {
        (_dao, _payload);
        permissions = mockPermissions(5, 7, PermissionLib.Operation.Revoke);
    }

    /// @inheritdoc IPluginSetup
    function implementation() external view virtual override returns (address) {
        return address(pluginBase);
    }
}
