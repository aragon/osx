// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Permission, PluginSetup, PluginSetupProcessor} from "../../../plugin/PluginSetup.sol";
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

    function prepareInstallDataABI() external view virtual override returns (string memory) {
        return "(address samePluginAddress)";
    }

    function prepareInstallation(address _dao, bytes memory)
        public
        virtual
        override
        returns (PluginSetupProcessor.PluginInstallParams memory params)
    {
        address helperAddr = createERC1967Proxy(_dao, address(helperBase), bytes(""));

        params.plugin = createERC1967Proxy(
            _dao,
            address(pluginBase),
            abi.encodeWithSelector(
                bytes4(keccak256("initialize(uint256,address,string)")),
                PLUGIN_INIT_NUMBER,
                helperAddr,
                "stringExample"
            )
        );

        params.permissions = new Permission.ItemMultiTarget[](2);
        params.helpers = new address[](1);

        params.helpers[0] = helperAddr;
        params.permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            _dao,
            params.plugin,
            NO_ORACLE,
            keccak256("EXECUTE_PERMISSION")
        );

        params.permissions[1] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            params.plugin,
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
        bytes calldata _data
    )
        external
        virtual
        override
        returns (PluginSetupProcessor.PluginUninstallParams memory params)
    {}

    function prepareUpdateDataABI() external view virtual override returns (string memory) {
        return "";
    }

    function prepareUpdate(
        address _dao,
        address _plugin, // proxy
        address[] memory _helpers,
        uint16[3] calldata,
        bytes memory
    ) public virtual override returns (PluginSetupProcessor.PluginUpdateParams memory params) {
        params.initData = abi.encodeWithSelector(
            bytes4(keccak256("initializeV2(string)")),
            "stringExample"
        );

        address helperAddr = createERC1967Proxy(_dao, address(helperBase), bytes(""));

        params.permissions = new Permission.ItemMultiTarget[](2);
        params.oldHelpers = _helpers;
        params.newHelpers = new address[](_helpers.length + 1);

        for (uint256 i = 0; i < _helpers.length; i++) {
            params.newHelpers[i] = _helpers[i];
        }

        params.newHelpers[_helpers.length] = helperAddr;

        params.permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            helperAddr,
            _plugin,
            NO_ORACLE,
            keccak256("NEW_PERMISSION")
        );

        params.permissions[1] = Permission.ItemMultiTarget(
            Permission.Operation.Revoke,
            _plugin,
            params.newHelpers[0],
            NO_ORACLE,
            keccak256("SETTINGS_PERMISSION")
        );
    }

    function getImplementationAddress() public view virtual override returns (address) {
        return address(pluginBase);
    }
}
