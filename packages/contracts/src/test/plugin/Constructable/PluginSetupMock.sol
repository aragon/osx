// SPDX-License-Identifier: AGPL-3.0-or-later

/* solhint-disable one-contract-per-file */
pragma solidity ^0.8.8;

import {PermissionLib} from "@aragon/osx-commons-contracts/src/permission/PermissionLib.sol";
import {IPluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/IPluginSetup.sol";
import {PluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/PluginSetup.sol";
import {ProxyLib} from "@aragon/osx-commons-contracts/src/utils/deployment/ProxyLib.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

import {mockPermissions, mockHelpers} from "../PluginSetupMockData.sol";
import {PluginMockBuild1} from "./PluginMock.sol";

/// @notice A mock plugin setup of a plugin to be deployed via the `new` keyword.
/// v1.1 (Release 1, Build 1)
/// @dev DO NOT USE IN PRODUCTION!
contract PluginSetupMockBuild1 is PluginSetup {
    constructor() PluginSetup(address(new PluginMockBuild1(IDAO(address(0))))) {}

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory _data
    ) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
        (_data);
        plugin = address(new PluginMockBuild1(IDAO(_dao)));
        preparedSetupData.helpers = mockHelpers(1);
        preparedSetupData.permissions = mockPermissions(0, 1, PermissionLib.Operation.Grant);
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(
        address _dao,
        SetupPayload calldata _payload
    ) external pure returns (PermissionLib.MultiTargetPermission[] memory permissions) {
        (_dao, _payload);
        permissions = mockPermissions(0, 1, PermissionLib.Operation.Revoke);
    }
}
