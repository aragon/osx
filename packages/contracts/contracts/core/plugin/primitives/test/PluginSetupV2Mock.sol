// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PermissionLib} from "../../permission/PermissionLib.sol";
import {PluginSetup} from "../../../infrastructure/plugin/setup/PluginSetup.sol";
import {IPluginSetup} from "../../../infrastructure/plugin/setup/IPluginSetup.sol";
import {PluginUUPSUpgradeableV2Mock} from "./PluginUUPSUpgradeableV2Mock.sol";

// The second version of plugin manager.
contract PluginSetupV2Mock is PluginSetup {
    PluginUUPSUpgradeableV2Mock public helperBase;
    PluginUUPSUpgradeableV2Mock public pluginBase;

    uint256 public constant PLUGIN_INIT_NUMBER = 15;
    address private constant NO_ORACLE = address(0);

    constructor() {
        // User the plugin as helper for testing puposes.
        helperBase = new PluginUUPSUpgradeableV2Mock();
        // V2 version
        pluginBase = new PluginUUPSUpgradeableV2Mock();
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallationDataABI() external view virtual override returns (string memory) {
        return "(address samePluginAddress)";
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
        address helperAddr = createERC1967Proxy(address(helperBase), bytes(""));

        plugin = createERC1967Proxy(
            address(pluginBase),
            abi.encodeWithSelector(
                bytes4(keccak256("initialize(address,uint256,address,string)")),
                _dao,
                PLUGIN_INIT_NUMBER,
                helperAddr,
                "stringExample"
            )
        );

        permissions = new PermissionLib.ItemMultiTarget[](2);
        helpers = new address[](1);

        helpers[0] = helperAddr;
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
        bytes calldata _data
    ) external virtual override returns (PermissionLib.ItemMultiTarget[] memory permissions) {}

    function prepareUpdateDataABI() external view virtual override returns (string memory) {
        return "";
    }

    /// @inheritdoc IPluginSetup
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
        (_dao); // silence compiler warning

        initData = abi.encodeWithSelector(
            bytes4(keccak256("initializeV2(string)")),
            "stringExample"
        );

        address helperAddr = createERC1967Proxy(address(helperBase), bytes(""));

        permissions = new PermissionLib.ItemMultiTarget[](2);
        activeHelpers = new address[](_helpers.length + 1);

        for (uint256 i = 0; i < _helpers.length; i++) {
            activeHelpers[i] = _helpers[i];
        }

        activeHelpers[_helpers.length] = helperAddr;

        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            helperAddr,
            _plugin,
            NO_ORACLE,
            keccak256("NEW_PERMISSION")
        );

        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _plugin,
            activeHelpers[0],
            NO_ORACLE,
            keccak256("SETTINGS_PERMISSION")
        );
    }

    /// @inheritdoc IPluginSetup
    function getImplementationAddress() public view virtual override returns (address) {
        return address(pluginBase);
    }
}
