// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
import {PluginSetup} from "../../../plugin/PluginSetup.sol";
import {IPluginSetup} from "../../../plugin/IPluginSetup.sol";
import {PluginUUPSUpgradeableV1Mock, PluginUUPSUpgradeableV2Mock, PluginUUPSUpgradeableV3Mock} from "./PluginUUPSUpgradeableMock.sol";

import "./PluginMockData.sol";

// The first version of plugin setup.
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
            PermissionLib.ItemMultiTarget[] memory permissions
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
        address[] calldata _activeHelpers,
        bytes calldata
    ) external virtual override returns (PermissionLib.ItemMultiTarget[] memory permissions) {
        (_dao, _plugin, _activeHelpers);
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
            PermissionLib.ItemMultiTarget[] memory permissions
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
            PermissionLib.ItemMultiTarget[] memory permissions
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
            address[] memory activeHelpers,
            bytes memory initData,
            PermissionLib.ItemMultiTarget[] memory permissions
        )
    {
        // Update from V1
        if (_oldVersion[0] == 1 && _oldVersion[1] == 0 && _oldVersion[2] == 0) {
            (_dao, _plugin, _helpers);
            activeHelpers = mockHelpers(2);
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
            PermissionLib.ItemMultiTarget[] memory permissions
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
            address[] memory activeHelpers,
            bytes memory initData,
            PermissionLib.ItemMultiTarget[] memory permissions
        )
    {
        (_dao, _plugin, _helpers);

        // Update from V1
        if (_oldVersion[0] == 1 && _oldVersion[1] == 0 && _oldVersion[2] == 0) {
            (_dao, _plugin, _helpers);
            activeHelpers = mockHelpers(3);
            initData = abi.encodeWithSelector(
                PluginUUPSUpgradeableV3Mock.initializeV1toV3.selector
            );
            permissions = mockPermissions(1, 3, PermissionLib.Operation.Grant);
        }

        // Update from V2
        if (_oldVersion[0] == 1 && _oldVersion[1] == 1 && _oldVersion[2] == 0) {
            (_dao, _plugin, _helpers);
            activeHelpers = mockHelpers(3);
            initData = abi.encodeWithSelector(
                PluginUUPSUpgradeableV3Mock.initializeV2toV3.selector
            );
            permissions = mockPermissions(2, 3, PermissionLib.Operation.Grant);
        }
    }
}
