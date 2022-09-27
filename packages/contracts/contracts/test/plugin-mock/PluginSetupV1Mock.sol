// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {BulkPermissionsLib} from "../../core/permission/BulkPermissionsLib.sol";
import {PluginSetup} from "../../plugin/PluginSetup.sol";
import {PluginUUPSUpgradableV1Mock} from "./PluginUUPSUpgradableV1Mock.sol";

// The first version of plugin setup.
contract PluginSetupV1Mock is PluginSetup {
    PluginUUPSUpgradableV1Mock public helperBase;
    PluginUUPSUpgradableV1Mock public pluginBase;

    uint256 public constant PLUGIN_INIT_NUMBER = 15;

    address private constant NO_ORACLE = address(0);

    constructor() {
        // User the plugin as helper for testing puposes.
        helperBase = new PluginUUPSUpgradableV1Mock();
        // V1 version.
        pluginBase = new PluginUUPSUpgradableV1Mock();
    }

    function prepareInstallation(address _dao, bytes memory)
        public
        virtual
        override
        returns (
            address plugin,
            address[] memory helpers,
            BulkPermissionsLib.ItemMultiTarget[] memory permissions
        )
    {
        // Deploy a helper.
        address helperAddr = createERC1967Proxy(address(helperBase), bytes("")); // TODO Why does this receive no initialization data?

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
        permissions = new BulkPermissionsLib.ItemMultiTarget[](2);
        permissions[0] = BulkPermissionsLib.ItemMultiTarget(
            BulkPermissionsLib.Operation.Grant,
            _dao,
            plugin,
            NO_ORACLE,
            keccak256("EXEC_PERMISSION")
        );

        permissions[1] = BulkPermissionsLib.ItemMultiTarget(
            BulkPermissionsLib.Operation.Grant,
            plugin,
            helperAddr,
            NO_ORACLE,
            keccak256("SETTINGS_PERMISSION")
        );
    }

    function prepareUninstallation(
        address _dao,
        address _plugin,
        address[] calldata _activeHelpers
    ) external virtual override returns (BulkPermissionsLib.ItemMultiTarget[] memory permissions) {
        permissions = new BulkPermissionsLib.ItemMultiTarget[](2);
        permissions[0] = BulkPermissionsLib.ItemMultiTarget(
            BulkPermissionsLib.Operation.Revoke,
            _dao,
            _plugin,
            NO_ORACLE,
            keccak256("EXEC_PERMISSION")
        );

        permissions[1] = BulkPermissionsLib.ItemMultiTarget(
            BulkPermissionsLib.Operation.Revoke,
            _plugin,
            _activeHelpers[0],
            NO_ORACLE,
            keccak256("SETTINGS_PERMISSION")
        );
    }

    function getImplementationAddress() public view virtual override returns (address) {
        return address(pluginBase);
    }

    function prepareInstallABI() external view virtual override returns (string memory) {
        return "";
    }
}
