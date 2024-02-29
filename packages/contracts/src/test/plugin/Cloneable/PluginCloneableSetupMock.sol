// SPDX-License-Identifier: AGPL-3.0-or-later

/* solhint-disable one-contract-per-file */
pragma solidity ^0.8.8;

import {PermissionLib} from "@aragon/osx-commons-contracts/src/permission/PermissionLib.sol";
import {IPluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/IPluginSetup.sol";
import {PluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/PluginSetup.sol";
import {ProxyLib} from "@aragon/osx-commons-contracts/src/utils/deployment/ProxyLib.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

import {mockPermissions, mockHelpers} from "../PluginSetupMockData.sol";
import {PluginCloneableMockBuild1, PluginCloneableMockBuild2} from "./PluginCloneableMock.sol";

/// @notice A mock plugin setup of a cloneable plugin to be deployed via the minimal proxy pattern.
/// v1.1 (Release 1, Build 1)
/// @dev DO NOT USE IN PRODUCTION!
contract PluginCloneableSetupMockBuild1 is PluginSetup {
    using ProxyLib for address;

    uint16 internal constant THIS_BUILD = 1;

    constructor() PluginSetup(address(new PluginCloneableMockBuild1())) {}

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory
    ) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
        bytes memory initData = abi.encodeCall(PluginCloneableMockBuild1.initialize, (IDAO(_dao)));
        plugin = implementation().deployMinimalProxy(initData);
        preparedSetupData.helpers = mockHelpers(THIS_BUILD);
        preparedSetupData.permissions = mockPermissions(
            0,
            THIS_BUILD,
            PermissionLib.Operation.Grant
        );
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(
        address _dao,
        SetupPayload calldata _payload
    ) external pure returns (PermissionLib.MultiTargetPermission[] memory permissions) {
        (_dao, _payload);
        permissions = mockPermissions(0, THIS_BUILD, PermissionLib.Operation.Revoke);
    }
}

/// @notice A mock plugin setup of a cloneable plugin to be deployed via the minimal proxy pattern.
/// v1.2 (Release 1, Build 2)
/// @dev DO NOT USE IN PRODUCTION!
contract PluginCloneableSetupMockBuild2 is PluginSetup {
    using ProxyLib for address;

    uint16 internal constant THIS_BUILD = 2;

    constructor() PluginSetup(address(new PluginCloneableMockBuild2())) {}

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory
    ) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
        bytes memory initData = abi.encodeCall(PluginCloneableMockBuild2.initialize, (IDAO(_dao)));
        plugin = implementation().deployMinimalProxy(initData);
        preparedSetupData.helpers = mockHelpers(THIS_BUILD);
        preparedSetupData.permissions = mockPermissions(
            0,
            THIS_BUILD,
            PermissionLib.Operation.Grant
        );
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(
        address _dao,
        SetupPayload calldata _payload
    ) external pure returns (PermissionLib.MultiTargetPermission[] memory permissions) {
        (_dao, _payload);
        permissions = mockPermissions(0, THIS_BUILD, PermissionLib.Operation.Revoke);
    }
}
