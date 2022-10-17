// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
import {PluginSetup} from "../../../plugin/PluginSetup.sol";
import {IPluginSetup} from "../../../plugin/IPluginSetup.sol";
import {PluginUUPSUpgradeableV1Mock, PluginUUPSUpgradeableV2Mock, PluginUUPSUpgradeableV3Mock} from "./PluginUUPSUpgradeableV1Mock.sol";

import "./PluginMockData.sol";

// The first version of plugin setup.
contract PluginSetupV1Mock is PluginSetup {
    address public pluginBase;

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
        permissions = mockPermissions(1, PermissionLib.Operation.Grant);
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
        permissions = mockPermissions(1, PermissionLib.Operation.Revoke);
    }

    /// @inheritdoc IPluginSetup
    function getImplementationAddress() public view virtual override returns (address) {
        return address(pluginBase);
    }
}

contract PluginSetupV1MockBad is PluginSetupV1Mock {
    function prepareInstallation(address _dao, bytes memory)
        public
        override
        returns (
            address plugin,
            address[] memory helpers,
            PermissionLib.ItemMultiTarget[] memory permissions
        )
    {
        plugin = address(0); // The bad behaviour is returning the same address over and over again
        helpers = mockHelpers(1);
        permissions = mockPermissions(1, PermissionLib.Operation.Grant);
    }
}

contract PluginSetupV2Mock is PluginSetupV1Mock {
    constructor() {
        pluginBase = address(new PluginUUPSUpgradeableV2Mock());
    }

    function prepareUpdate(
        address _dao,
        address _plugin, // proxy
        address[] memory _helpers,
        uint16[3] calldata,
        bytes memory
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
        activeHelpers = mockHelpers(1);
        permissions = mockPermissions(1, PermissionLib.Operation.Revoke);
    }
}

contract PluginSetupV3Mock is PluginSetupV2Mock {
    constructor() {
        pluginBase = address(new PluginUUPSUpgradeableV3Mock());
    }
}
