// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
import {IDAO} from "../../../core/IDAO.sol";
import {PluginSetup} from "../../../plugin/PluginSetup.sol";
import {IPluginSetup} from "../../../plugin/IPluginSetup.sol";
import {PluginUUPSUpgradeableV1Mock, PluginUUPSUpgradeableV2Mock, PluginUUPSUpgradeableV3Mock} from "./PluginUUPSUpgradeableMock.sol";
import {mockPermissions, mockHelpers, mockPluginProxy} from "../PluginMockData.sol";

contract PluginUUPSUpgradeableSetupV1Mock is PluginSetup {
    address internal pluginBase;

    constructor() {
        pluginBase = address(new PluginUUPSUpgradeableV1Mock());
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallationDataABI() external view virtual override returns (string memory) {
        return "";
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallation(address _dao, bytes memory)
        public
        virtual
        override
        returns (address plugin, PreparedDependency memory preparedDependency)
    {
        plugin = mockPluginProxy(pluginBase, _dao);
        preparedDependency.helpers = mockHelpers(1);
        preparedDependency.permissions = mockPermissions(0, 1, PermissionLib.Operation.Grant);
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallationDataABI() external view virtual override returns (string memory) {
        return "";
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(address _dao, SetupPayload calldata _payload)
        external
        virtual
        override
        returns (PermissionLib.ItemMultiTarget[] memory permissions)
    {
        (_dao, _payload);
        permissions = mockPermissions(0, 1, PermissionLib.Operation.Revoke);
    }

    /// @inheritdoc IPluginSetup
    function getImplementationAddress() external view virtual override returns (address) {
        return address(pluginBase);
    }
}

contract PluginUUPSUpgradeableSetupV1MockBad is PluginUUPSUpgradeableSetupV1Mock {
    function prepareInstallation(address _dao, bytes memory)
        public
        pure
        override
        returns (address plugin, PreparedDependency memory preparedDependency)
    {
        (_dao);
        plugin = address(0); // The bad behaviour is returning the same address over and over again
        preparedDependency.helpers = mockHelpers(1);
        preparedDependency.permissions = mockPermissions(0, 1, PermissionLib.Operation.Grant);
    }
}

contract PluginUUPSUpgradeableSetupV2Mock is PluginUUPSUpgradeableSetupV1Mock {
    constructor() {
        pluginBase = address(new PluginUUPSUpgradeableV2Mock());
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallation(address _dao, bytes memory)
        public
        virtual
        override
        returns (address plugin, PreparedDependency memory preparedDependency)
    {
        plugin = mockPluginProxy(pluginBase, _dao);
        preparedDependency.helpers = mockHelpers(2);
        preparedDependency.permissions = mockPermissions(0, 2, PermissionLib.Operation.Grant);
    }

    function prepareUpdate(
        address _dao,
        uint16 _currentBuild,
        SetupPayload calldata _payload
    )
        public
        virtual
        override
        returns (bytes memory initData, PreparedDependency memory preparedDependency)
    {
        (_dao, _payload);

        // Update from V1
        if (_currentBuild == 1) {
            // if (_oldVersion[0] == 1 && _oldVersion[1] == 0 && _oldVersion[2] == 0) { // TODO:GIORGI
            preparedDependency.helpers = mockHelpers(2);
            initData = abi.encodeWithSelector(
                PluginUUPSUpgradeableV2Mock.initializeV1toV2.selector
            );
            preparedDependency.permissions = mockPermissions(1, 2, PermissionLib.Operation.Grant);
        }
    }
}

contract PluginUUPSUpgradeableSetupV3Mock is PluginUUPSUpgradeableSetupV2Mock {
    constructor() {
        pluginBase = address(new PluginUUPSUpgradeableV3Mock());
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallation(address _dao, bytes memory)
        public
        virtual
        override
        returns (address plugin, PreparedDependency memory preparedDependency)
    {
        plugin = mockPluginProxy(pluginBase, _dao);
        preparedDependency.helpers = mockHelpers(3);
        preparedDependency.permissions = mockPermissions(0, 3, PermissionLib.Operation.Grant);
    }

    function prepareUpdate(
        address _dao,
        uint16 _currentBuild,
        SetupPayload calldata _payload
    )
        public
        virtual
        override
        returns (bytes memory initData, PreparedDependency memory preparedDependency)
    {
        (_dao, _payload);

        // Update from V1
        if (_currentBuild == 1) {
            // if (_oldVersion[0] == 1 && _oldVersion[1] == 0 && _oldVersion[2] == 0) { // TODO:GIORGI
            preparedDependency.helpers = mockHelpers(3);
            initData = abi.encodeWithSelector(
                PluginUUPSUpgradeableV3Mock.initializeV1toV3.selector
            );
            preparedDependency.permissions = mockPermissions(1, 3, PermissionLib.Operation.Grant);
        }

        // Update from V2
        if (_currentBuild == 2) {
            // if (_oldVersion[0] == 1 && _oldVersion[1] == 1 && _oldVersion[2] == 0) { // TODO:GIORGI
            preparedDependency.helpers = mockHelpers(3);
            initData = abi.encodeWithSelector(
                PluginUUPSUpgradeableV3Mock.initializeV2toV3.selector
            );
            preparedDependency.permissions = mockPermissions(2, 3, PermissionLib.Operation.Grant);
        }
    }
}

/// @dev With this plugin setup, the plugin base implementation doesn't change.
/// This setup is a good example when you want to design a new plugin setup
/// which uses the same base implementation(doesn't update the logic contract)
/// but applies new/modifier permissions on it.

contract PluginUUPSUpgradeableSetupV4Mock is PluginUUPSUpgradeableSetupV3Mock {
    constructor(address _pluginUUPSUpgradeableV3) {
        pluginBase = _pluginUUPSUpgradeableV3;
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallation(address _dao, bytes memory)
        public
        virtual
        override
        returns (address plugin, PreparedDependency memory preparedDependency)
    {
        plugin = mockPluginProxy(pluginBase, _dao);
        preparedDependency.helpers = mockHelpers(3);
        preparedDependency.permissions = mockPermissions(0, 3, PermissionLib.Operation.Grant);
    }

    function prepareUpdate(
        address _dao,
        uint16 _currentBuild,
        SetupPayload calldata _payload
    )
        public
        virtual
        override
        returns (bytes memory initData, PreparedDependency memory preparedDependency)
    {
        // if oldVersion is previous pluginsetup prior to this one
        // (E.x This one is 1.3.0, the previous one is 1.2.0)
        // This means plugin base implementations(a.k.a contract logic code)
        // don't change Which means this update should only include returning
        // the desired updated permissions. PluginSetupProcessor will take care of
        // not calling `upgradeTo` on the plugin in such cases.
        // if (_oldVersion[0] == 1 && _oldVersion[1] == 2 && _oldVersion[2] == 0) {
        if (_currentBuild == 3) {
            preparedDependency.permissions = mockPermissions(3, 4, PermissionLib.Operation.Grant);
        }
        // If the update happens from the previous's previous plugin setups
        // (1.1.0 or 1.0.0), that means logic contracts change and It's required
        // to call initialize for the upgrade call. Logic below is just a test
        // but dev is free to do what he wishes.
        else if (
            // (_oldVersion[0] == 1 && _oldVersion[1] == 0 && _oldVersion[2] == 0) ||
            // (_oldVersion[0] == 1 && _oldVersion[1] == 1 && _oldVersion[2] == 0)
            _currentBuild == 1 || _currentBuild == 2
        ) {
            (initData, preparedDependency) = super.prepareUpdate(_dao, _currentBuild, _payload);
            // Even for this case, dev might decide to modify the permissions..
            preparedDependency.permissions = mockPermissions(4, 5, PermissionLib.Operation.Grant);
        }
    }
}
