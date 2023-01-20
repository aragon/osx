// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
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
        returns (
            address plugin,
            address[] memory helpers,
            PermissionLib.MultiTargetPermission[] memory permissions
        )
    {
        plugin = mockPluginProxy(pluginBase, _dao);
        helpers = mockHelpers(1);
        permissions = mockPermissions(0, 1, PermissionLib.Operation.Grant);
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallationDataABI() external view virtual override returns (string memory) {
        return "";
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(
        address _dao,
        address _plugin,
        address[] calldata _currentHelpers,
        bytes calldata
    ) external virtual override returns (PermissionLib.MultiTargetPermission[] memory permissions) {
        (_dao, _plugin, _currentHelpers);
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
        returns (
            address plugin,
            address[] memory helpers,
            PermissionLib.MultiTargetPermission[] memory permissions
        )
    {
        (_dao);
        plugin = address(0); // The bad behaviour is returning the same address over and over again
        helpers = mockHelpers(1);
        permissions = mockPermissions(0, 1, PermissionLib.Operation.Grant);
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
        returns (
            address plugin,
            address[] memory helpers,
            PermissionLib.MultiTargetPermission[] memory permissions
        )
    {
        plugin = mockPluginProxy(pluginBase, _dao);
        helpers = mockHelpers(2);
        permissions = mockPermissions(0, 2, PermissionLib.Operation.Grant);
    }

    function prepareUpdate(
        address _dao,
        address _plugin,
        address[] memory _helpers,
        uint16[3] calldata _oldVersion,
        bytes calldata
    )
        public
        virtual
        override
        returns (
            address[] memory currentHelpers,
            bytes memory initData,
            PermissionLib.MultiTargetPermission[] memory permissions
        )
    {
        // Update from V1
        if (_oldVersion[0] == 1 && _oldVersion[1] == 0 && _oldVersion[2] == 0) {
            (_dao, _plugin, _helpers);
            currentHelpers = mockHelpers(2);
            initData = abi.encodeWithSelector(
                PluginUUPSUpgradeableV2Mock.initializeV1toV2.selector
            );
            permissions = mockPermissions(1, 2, PermissionLib.Operation.Grant);
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
        returns (
            address plugin,
            address[] memory helpers,
            PermissionLib.MultiTargetPermission[] memory permissions
        )
    {
        plugin = mockPluginProxy(pluginBase, _dao);
        helpers = mockHelpers(3);
        permissions = mockPermissions(0, 3, PermissionLib.Operation.Grant);
    }

    function prepareUpdate(
        address _dao,
        address _plugin,
        address[] memory _helpers,
        uint16[3] calldata _oldVersion,
        bytes calldata
    )
        public
        virtual
        override
        returns (
            address[] memory currentHelpers,
            bytes memory initData,
            PermissionLib.MultiTargetPermission[] memory permissions
        )
    {
        (_dao, _plugin, _helpers);

        // Update from V1
        if (_oldVersion[0] == 1 && _oldVersion[1] == 0 && _oldVersion[2] == 0) {
            (_dao, _plugin, _helpers);
            currentHelpers = mockHelpers(3);
            initData = abi.encodeWithSelector(
                PluginUUPSUpgradeableV3Mock.initializeV1toV3.selector
            );
            permissions = mockPermissions(1, 3, PermissionLib.Operation.Grant);
        }

        // Update from V2
        if (_oldVersion[0] == 1 && _oldVersion[1] == 1 && _oldVersion[2] == 0) {
            (_dao, _plugin, _helpers);
            currentHelpers = mockHelpers(3);
            initData = abi.encodeWithSelector(
                PluginUUPSUpgradeableV3Mock.initializeV2toV3.selector
            );
            permissions = mockPermissions(2, 3, PermissionLib.Operation.Grant);
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
        returns (
            address plugin,
            address[] memory helpers,
            PermissionLib.MultiTargetPermission[] memory permissions
        )
    {
        plugin = mockPluginProxy(pluginBase, _dao);
        helpers = mockHelpers(3);
        permissions = mockPermissions(0, 3, PermissionLib.Operation.Grant);
    }

    function prepareUpdate(
        address _dao,
        address _plugin,
        address[] memory _helpers,
        uint16[3] calldata _oldVersion,
        bytes calldata _data
    )
        public
        virtual
        override
        returns (
            address[] memory currentHelpers,
            bytes memory initData,
            PermissionLib.MultiTargetPermission[] memory permissions
        )
    {
        (_dao, _plugin, _helpers);

        // if oldVersion is previous pluginsetup prior to this one
        // (E.x This one is 1.3.0, the previous one is 1.2.0)
        // This means plugin base implementations(a.k.a contract logic code) 
        // don't change Which means this update should only include returning 
        // the desired updated permissions. PluginSetupProcessor will take care of 
        // not calling `upgradeTo` on the plugin in such cases.
        if (_oldVersion[0] == 1 && _oldVersion[1] == 2 && _oldVersion[2] == 0) {
            permissions = mockPermissions(3, 4, PermissionLib.Operation.Grant);
        }
        // If the update happens from the previous's previous plugin setups
        // (1.1.0 or 1.0.0), that means logic contracts change and It's required 
        // to call initialize for the upgrade call. Logic below is just a test 
        // but dev is free to do what he wishes.
        else if (
            (_oldVersion[0] == 1 && _oldVersion[1] == 0 && _oldVersion[2] == 0) ||
            (_oldVersion[0] == 1 && _oldVersion[1] == 1 && _oldVersion[2] == 0)
        ) {
            (currentHelpers, initData, ) = super.prepareUpdate(
                _dao,
                _plugin,
                _helpers,
                _oldVersion,
                _data
            );
            // Even for this case, dev might decide to modify the permissions..
            permissions = mockPermissions(4, 5, PermissionLib.Operation.Grant);
        }
    }
}
