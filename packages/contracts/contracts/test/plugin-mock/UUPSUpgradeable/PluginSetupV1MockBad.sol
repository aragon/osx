// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Permission, PluginSetup} from "../../../plugin/PluginSetup.sol";
import {PluginUUPSUpgradeableV1Mock} from "./PluginUUPSUpgradeableV1Mock.sol";

// The first version of plugin setup.
contract PluginSetupV1MockBad is PluginSetup {
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

    function prepareInstallDataABI() external view virtual override returns (string memory) {
        return "(address samePluginAddress)";
    }

    function prepareInstallation(address _dao, bytes memory _data)
        public
        virtual
        override
        returns (
            address plugin,
            address[] memory helpers,
            Permission.ItemMultiTarget[] memory permissions
        )
    {
        // Deploy a helper.
        address helperAddr = createERC1967Proxy(_dao, address(helperBase), bytes(""));

        address _samePluginAddress = abi.decode(_data, (address));

        // For testing purposes: this setup returns the same adress that was passed as a plugin.
        if (_samePluginAddress != address(0)) {
            plugin = _samePluginAddress;
        } else {
            // Deploy and set the plugn.
            plugin = createERC1967Proxy(
                _dao,
                address(pluginBase),
                abi.encodeWithSelector(
                    bytes4(keccak256("initialize(uint256,address)")),
                    PLUGIN_INIT_NUMBER,
                    helperAddr
                )
            );
        }

        // Set helper.
        helpers = new address[](1);
        helpers[0] = helperAddr;

        // Set permissions.
        permissions = new Permission.ItemMultiTarget[](2);
        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            _dao,
            plugin,
            NO_ORACLE,
            keccak256("EXEC_PERMISSION")
        );

        permissions[1] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            plugin,
            helperAddr,
            NO_ORACLE,
            keccak256("SETTINGS_PERMISSION")
        );
    }

    function prepareUninstallDataABI() external view virtual override returns (string memory) {
        return "";
    }

    function prepareUninstallation(
        address _dao,
        address _plugin,
        address[] calldata _activeHelpers,
        bytes calldata
    ) external virtual override returns (Permission.ItemMultiTarget[] memory permissions) {
        permissions = new Permission.ItemMultiTarget[](2);
        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Revoke,
            _dao,
            _plugin,
            NO_ORACLE,
            keccak256("EXEC_PERMISSION")
        );

        permissions[1] = Permission.ItemMultiTarget(
            Permission.Operation.Revoke,
            _plugin,
            _activeHelpers[0],
            NO_ORACLE,
            keccak256("SETTINGS_PERMISSION")
        );
    }

    function getImplementationAddress() public view virtual override returns (address) {
        return address(pluginBase);
    }
}
