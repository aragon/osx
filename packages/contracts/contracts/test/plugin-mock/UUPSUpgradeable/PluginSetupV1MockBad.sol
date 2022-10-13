// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Permission, PluginSetup} from "../../../plugin/PluginSetup.sol";
import {PluginUUPSUpgradeableV1Mock} from "./PluginUUPSUpgradeableV1Mock.sol";

// The first version of plugin setup.
contract PluginSetupV1MockBad is PluginSetup {
    PluginUUPSUpgradeableV1Mock public helperBase;
    PluginUUPSUpgradeableV1Mock public pluginBase;

    uint256 public constant PLUGIN_INIT_NUMBER = 15;

    address private noOracle;

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
        permissions = new Permission.ItemMultiTarget[](_samePluginAddress != address(0) ? 2 : 1);
        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            _dao,
            plugin,
            noOracle,
            keccak256("EXECUTE_PERMISSION")
        );

        if (_samePluginAddress != address(0)) {
            permissions[1] = Permission.ItemMultiTarget(
                Permission.Operation.Grant,
                _dao,
                plugin,
                noOracle,
                keccak256("BAD_PERMISSION")
            );
        }
    }

    function prepareUninstallDataABI() external view virtual override returns (string memory) {
        return "(bool beBad)";
    }

    function prepareUninstallation(
        address _dao,
        address _plugin,
        address[] calldata _activeHelpers,
        bytes calldata _data
    ) external virtual override returns (Permission.ItemMultiTarget[] memory permissions) {
        bool beBad = abi.decode(_data, (bool));

        permissions = new Permission.ItemMultiTarget[](beBad ? 2 : 1);
        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Revoke,
            _dao,
            _plugin,
            noOracle,
            keccak256("EXECUTE_PERMISSION")
        );

        if (beBad) {
            permissions[1] = Permission.ItemMultiTarget(
                Permission.Operation.Grant,
                _plugin,
                _activeHelpers[0],
                noOracle,
                keccak256("BAD_PERMISSION")
            );
        }
    }

    function getImplementationAddress() public view virtual override returns (address) {
        return address(pluginBase);
    }
}
