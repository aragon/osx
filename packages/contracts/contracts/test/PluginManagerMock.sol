// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Permission, PluginManager, PluginManagerLib} from "../plugin/PluginManager.sol";
import {PluginUUPSUpgradableV1Mock, PluginUUPSUpgradableV2Mock} from "../test/PluginUUPSUpgradableMock.sol";

// The first version of plugin manager.
contract PluginManagerMock is PluginManager {
    using PluginManagerLib for PluginManagerLib.Data;

    PluginUUPSUpgradableV1Mock public helperBase;
    PluginUUPSUpgradableV1Mock public pluginBase;

    uint256 public constant PLUGIN_INIT_NUMBER = 15;

    address private constant NO_ORACLE = address(0);

    constructor() {
        helperBase = new PluginUUPSUpgradableV1Mock();
        pluginBase = new PluginUUPSUpgradableV1Mock();
    }

    function deploy(address dao, bytes memory data)
        public
        virtual
        override
        returns (
            address plugin,
            address[] memory helpers,
            Permission.ItemMultiTarget[] memory permissions
        )
    {
        address helperAddr = createERC1967Proxy(dao, address(helperBase), bytes(""));

        plugin = createERC1967Proxy(
            dao,
            address(pluginBase),
            abi.encodeWithSelector(bytes4(keccak256("initialize(uint256)")), PLUGIN_INIT_NUMBER)
        );

        permissions = new Permission.ItemMultiTarget[](2);
        helpers = new address[](1);

        helpers[0] = helperAddr;
        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            dao,
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

    function getImplementationAddress() public view virtual override returns (address) {
        return address(pluginBase);
    }

    function deployABI() external view virtual override returns (string memory) {
        return "";
    }
}

// The second version of plugin manager.
contract PluginManagerV2Mock is PluginManager {
    using PluginManagerLib for PluginManagerLib.Data;

    PluginUUPSUpgradableV1Mock public helperBase;
    PluginUUPSUpgradableV2Mock public pluginBase;

    uint256 public constant PLUGIN_INIT_NUMBER = 15;
    address private constant NO_ORACLE = address(0);

    constructor() {
        helperBase = new PluginUUPSUpgradableV1Mock();
        // V2 version
        pluginBase = new PluginUUPSUpgradableV2Mock();
    }

    function deploy(address dao, bytes memory data)
        public
        virtual
        override
        returns (
            address plugin,
            address[] memory helpers,
            Permission.ItemMultiTarget[] memory permissions
        )
    {
        address helperAddr = createERC1967Proxy(dao, address(helperBase), bytes(""));

        plugin = createERC1967Proxy(
            dao,
            address(pluginBase),
            abi.encodeWithSelector(bytes4(keccak256("initialize(uint256)")), PLUGIN_INIT_NUMBER)
        );

        permissions = new Permission.ItemMultiTarget[](2);
        helpers = new address[](1);

        helpers[0] = helperAddr;
        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            dao,
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

    function update(
        address dao,
        address plugin, // proxy
        address[] memory helpers,
        bytes memory data,
        uint16[3] calldata oldVersion
    )
        public
        virtual
        override
        returns (
            address[] memory activeHelpers,
            bytes memory initData,
            Permission.ItemMultiTarget[] memory permissions
        )
    {
        initData = abi.encodeWithSelector(
            bytes4(keccak256("initializeV2(string)")),
            "stringExample"
        );

        address helperAddr = createERC1967Proxy(dao, address(helperBase), bytes(""));

        permissions = new Permission.ItemMultiTarget[](2);
        activeHelpers = new address[](helpers.length + 1);

        for (uint256 i = 0; i < helpers.length; i++) {
            activeHelpers[i] = helpers[i];
        }

        activeHelpers[helpers.length] = helperAddr;

        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Revoke,
            dao,
            plugin,
            NO_ORACLE,
            keccak256("EXEC_PERMISSION")
        );

        permissions[1] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            helperAddr,
            plugin,
            NO_ORACLE,
            keccak256("GRANT_PERMISSION")
        );
    }

    function getImplementationAddress() public view virtual override returns (address) {
        return address(pluginBase);
    }

    function deployABI() external view virtual override returns (string memory) {
        return "";
    }
}
