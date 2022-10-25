// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PermissionLib} from "../../../permission/PermissionLib.sol";
import {PluginSetup} from "../../../../infrastructure/plugin-management/setup/PluginSetup.sol";
import {IPluginSetup} from "../../../../infrastructure/plugin-management/setup/IPluginSetup.sol";
import {PluginUUPSUpgradeableV1Mock} from "./PluginUUPSUpgradeableV1Mock.sol";

// The first version of plugin setup.
contract PluginSetupV1Mock is PluginSetup {
    PluginUUPSUpgradeableV1Mock public helperBase;
    PluginUUPSUpgradeableV1Mock public pluginBase;

    uint256 public constant PLUGIN_INIT_NUMBER = 15;

    address private constant NO_ORACLE = address(0);

    constructor() {
        // User the plugin as helper for testing puposes.
        helperBase = new PluginUUPSUpgradeableV1Mock();
        // V1 version.
        pluginBase = new PluginUUPSUpgradeableV1Mock();
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
        // Deploy a helper.
        address helperAddr = createERC1967Proxy(address(helperBase), bytes(""));

        // Deploy and set the plugn.
        plugin = createERC1967Proxy(
            address(pluginBase),
            abi.encodeWithSelector(
                bytes4(keccak256("initialize(address,uint256,address)")),
                _dao,
                PLUGIN_INIT_NUMBER,
                helperAddr
            )
        );

        // Set helper.
        helpers = new address[](1);
        helpers[0] = helperAddr;

        // Set permissions.
        permissions = new PermissionLib.ItemMultiTarget[](2);
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            _dao,
            plugin,
            NO_ORACLE,
            keccak256("EXECUTE_PERMISSION")
        );

        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            plugin,
            helperAddr,
            NO_ORACLE,
            keccak256("SETTINGS_PERMISSION")
        );
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
        permissions = new PermissionLib.ItemMultiTarget[](2);
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _dao,
            _plugin,
            NO_ORACLE,
            keccak256("EXECUTE_PERMISSION")
        );

        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _plugin,
            _activeHelpers[0],
            NO_ORACLE,
            keccak256("SETTINGS_PERMISSION")
        );
    }

    /// @inheritdoc IPluginSetup
    function getImplementationAddress() public view virtual override returns (address) {
        return address(pluginBase);
    }
}
