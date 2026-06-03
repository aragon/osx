// SPDX-License-Identifier: AGPL-3.0-or-later

/* solhint-disable one-contract-per-file */
pragma solidity ^0.8.8;

import {PermissionLib} from "../../../../src/common/permission/PermissionLib.sol";
import {IPluginSetup} from "../../../../src/common/plugin/setup/IPluginSetup.sol";
import {PluginSetup} from "../../../../src/common/plugin/setup/PluginSetup.sol";

import {mockPermissions, mockHelpers, mockPluginProxy} from "../PluginMockData.sol";
import {PluginCloneableV1Mock, PluginCloneableV1MockBad, PluginCloneableV2Mock} from "./PluginCloneableMock.sol";

contract PluginCloneableSetupV1Mock is PluginSetup {
    constructor(address implementation) PluginSetup(implementation) {}

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory
    ) public virtual override returns (address plugin, PreparedSetupData memory preparedSetupData) {
        plugin = mockPluginProxy(implementation(), _dao);
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
}

contract PluginCloneableSetupV1MockBad is PluginSetup {
    constructor(address implementation) PluginSetup(implementation) {}

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory
    ) public virtual override returns (address plugin, PreparedSetupData memory preparedSetupData) {
        plugin = mockPluginProxy(implementation(), _dao);
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
}

contract PluginCloneableSetupV2Mock is PluginCloneableSetupV1Mock {
    constructor(address implementation) PluginCloneableSetupV1Mock(implementation) {}

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory
    ) public virtual override returns (address plugin, PreparedSetupData memory preparedSetupData) {
        plugin = mockPluginProxy(implementation(), _dao);
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
}
