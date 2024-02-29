// SPDX-License-Identifier: AGPL-3.0-or-later

/* solhint-disable one-contract-per-file */
pragma solidity ^0.8.8;

import {PermissionLib} from "@aragon/osx-commons-contracts/src/permission/PermissionLib.sol";
import {IPluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/IPluginSetup.sol";
import {PluginUpgradeableSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/PluginUpgradeableSetup.sol";
import {ProxyLib} from "@aragon/osx-commons-contracts/src/utils/deployment/ProxyLib.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

import {mockPermissions, mockHelpers} from "../PluginSetupMockData.sol";
import {PluginUUPSUpgradeableMockBuild1, PluginUUPSUpgradeableMockBuild2, PluginUUPSUpgradeableMockBuild3} from "./PluginUUPSUpgradeableMock.sol";

/// @notice A mock plugin setup of an upgradeable plugin to be deployed via the UUPS pattern.
/// v1.1 (Release 1, Build 1)
/// @dev DO NOT USE IN PRODUCTION!
contract PluginUUPSUpgradeableSetupMockBuild1 is PluginUpgradeableSetup {
    using ProxyLib for address;

    uint16 internal constant THIS_BUILD = 1;

    constructor() PluginUpgradeableSetup(address(new PluginUUPSUpgradeableMockBuild1())) {}

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory
    ) public returns (address plugin, PreparedSetupData memory preparedSetupData) {
        bytes memory initData = abi.encodeCall(
            PluginUUPSUpgradeableMockBuild1.initialize,
            (IDAO(_dao))
        );
        plugin = implementation().deployUUPSProxy(initData);
        preparedSetupData.helpers = mockHelpers(1);
        preparedSetupData.permissions = mockPermissions(0, 1, PermissionLib.Operation.Grant);
    }

    /// @inheritdoc IPluginSetup
    /// @dev The default implementation for the initial build 1 that reverts because no earlier build exists.
    function prepareUpdate(
        address _dao,
        uint16 _fromBuild,
        SetupPayload calldata _payload
    ) external pure virtual returns (bytes memory, PreparedSetupData memory) {
        (_dao, _fromBuild, _payload);
        revert InvalidUpdatePath({fromBuild: 0, thisBuild: THIS_BUILD});
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

/// @notice A mock plugin setup of an upgradeable plugin to be deployed via the UUPS pattern.
/// v1.2 (Release 1, Build 2)
/// @dev DO NOT USE IN PRODUCTION!
contract PluginUUPSUpgradeableSetupMockBuild2 is PluginUpgradeableSetup {
    using ProxyLib for address;

    uint16 internal constant THIS_BUILD = 2;

    constructor() PluginUpgradeableSetup(address(new PluginUUPSUpgradeableMockBuild2())) {}

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory
    ) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
        bytes memory initData = abi.encodeCall(
            PluginUUPSUpgradeableMockBuild2.initialize,
            (IDAO(_dao))
        );
        plugin = implementation().deployUUPSProxy(initData);
        preparedSetupData.helpers = mockHelpers(THIS_BUILD);
        preparedSetupData.permissions = mockPermissions(
            0,
            THIS_BUILD,
            PermissionLib.Operation.Grant
        );
    }

    /// @inheritdoc IPluginSetup
    function prepareUpdate(
        address _dao,
        uint16 _fromBuild,
        SetupPayload calldata _payload
    )
        external
        pure
        override
        returns (bytes memory initData, PreparedSetupData memory preparedSetupData)
    {
        (_dao, _payload);

        // Update from Build 1
        if (_fromBuild == 1) {
            preparedSetupData.helpers = mockHelpers(THIS_BUILD);
            initData = abi.encodeCall(PluginUUPSUpgradeableMockBuild2.initializeFrom, (_fromBuild));
            preparedSetupData.permissions = mockPermissions(
                _fromBuild,
                THIS_BUILD,
                PermissionLib.Operation.Grant
            );
        }
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

/// @notice A mock plugin setup of an upgradeable plugin to be deployed via the UUPS pattern.
/// v1.3 (Release 1, Build 3)
contract PluginUUPSUpgradeableSetupMockBuild3 is PluginUpgradeableSetup {
    using ProxyLib for address;

    uint16 internal constant THIS_BUILD = 3;

    constructor() PluginUpgradeableSetup(address(new PluginUUPSUpgradeableMockBuild3())) {}

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory
    ) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
        bytes memory initData = abi.encodeCall(
            PluginUUPSUpgradeableMockBuild3.initialize,
            (IDAO(_dao))
        );
        plugin = implementation().deployUUPSProxy(initData);
        preparedSetupData.helpers = mockHelpers(THIS_BUILD);
        preparedSetupData.permissions = mockPermissions(
            0,
            THIS_BUILD,
            PermissionLib.Operation.Grant
        );
    }

    /// @inheritdoc IPluginSetup
    function prepareUpdate(
        address _dao,
        uint16 _fromBuild,
        SetupPayload calldata _payload
    )
        external
        pure
        override
        returns (bytes memory initData, PreparedSetupData memory preparedSetupData)
    {
        (_dao, _payload);

        // Update from Build 1
        if (_fromBuild == 1) {
            preparedSetupData.helpers = mockHelpers(THIS_BUILD);
            initData = abi.encodeCall(PluginUUPSUpgradeableMockBuild3.initializeFrom, (_fromBuild));
            preparedSetupData.permissions = mockPermissions(
                _fromBuild,
                THIS_BUILD,
                PermissionLib.Operation.Grant
            );

            // If this update path should not be supported, you can revert with an error, e.g.,
            // revert InvalidUpdatePath({fromBuild: _fromBuild, thisBuild: THIS_BUILD});
        }

        // Update from Build 2
        if (_fromBuild == 2) {
            preparedSetupData.helpers = mockHelpers(THIS_BUILD);
            initData = abi.encodeCall(PluginUUPSUpgradeableMockBuild3.initializeFrom, (_fromBuild));
            preparedSetupData.permissions = mockPermissions(
                _fromBuild,
                THIS_BUILD,
                PermissionLib.Operation.Grant
            );
        }
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
