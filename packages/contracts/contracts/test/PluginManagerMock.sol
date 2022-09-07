// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Permission, PluginManager, PluginManagerLib} from "../plugin/PluginManager.sol";
import {PluginUUPSUpgradableV1Mock, PluginUUPSUpgradableV2Mock} from "../test/PluginUUPSUpgradableMock.sol";

// The first version of plugin manager.
contract PluginManagerMock is PluginManager {
    using PluginManagerLib for PluginManagerLib.Data;

    PluginUUPSUpgradableV1Mock public helperBase;
    PluginUUPSUpgradableV1Mock public pluginBase;

    uint public constant PLUGIN_INIT_NUMBER = 15;

    address private constant NO_ORACLE = address(0);

    constructor() {
        helperBase = new PluginUUPSUpgradableV1Mock();
        pluginBase = new PluginUUPSUpgradableV1Mock();
    }

    function _getInstallInstruction(PluginManagerLib.Data memory installation)
        internal
        view
        override
        returns (PluginManagerLib.Data memory)
    {
        address helperAddr = installation.addHelper(address(helperBase), bytes(""));

        address pluginAddr = installation.addPlugin(
            address(pluginBase),
            abi.encodeWithSelector(bytes4(keccak256("initialize(uint256)")), PLUGIN_INIT_NUMBER)
        );

        installation.addPermission(
            Permission.Operation.Grant,
            installation.dao,
            pluginAddr,
            NO_ORACLE,
            keccak256("EXEC_PERMISSION")
        );

        installation.addPermission(
            Permission.Operation.Grant,
            pluginAddr,
            helperAddr,
            NO_ORACLE,
            keccak256("SETTINGS_PERMISSION")
        );

        return installation;
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

    address private constant NO_ORACLE = address(0);

    constructor() {
        helperBase = new PluginUUPSUpgradableV1Mock();
        // V2 version
        pluginBase = new PluginUUPSUpgradableV2Mock();
    }

    function _getInstallInstruction(PluginManagerLib.Data memory installation)
        internal
        view
        override
        returns (PluginManagerLib.Data memory)
    {
        address helperAddr = installation.addHelper(address(helperBase), bytes(""));

        address pluginAddr = installation.addPlugin(address(pluginBase), bytes(""));

        installation.addPermission(
            Permission.Operation.Grant,
            installation.dao,
            pluginAddr,
            NO_ORACLE,
            keccak256("EXEC_PERMISSION")
        );

        installation.addPermission(
            Permission.Operation.Grant,
            pluginAddr,
            helperAddr,
            NO_ORACLE,
            keccak256("SETTINGS_PERMISSION")
        );

        return installation;
    }

    function getImplementationAddress() public view virtual override returns (address) {
        return address(pluginBase);
    }

    function deployABI() external view virtual override returns (string memory) {
        return "";
    }

    function _getUpdateInstruction(
        address proxy,
        uint16[3] calldata oldVersion,
        PluginManagerLib.Data memory update
    ) internal view override returns (PluginManagerLib.Data memory, bytes memory initData) {
        initData = abi.encodeWithSelector(
            bytes4(keccak256("initializeV2(string)")),
            "stringExample"
        );

        address helperAddr = update.addHelper(address(helperBase), bytes(""));

        update.addPermission(
            Permission.Operation.Revoke,
            update.dao,
            proxy,
            NO_ORACLE,
            keccak256("EXEC_PERMISSION")
        );

        update.addPermission(
            Permission.Operation.Grant,
            helperAddr,
            proxy,
            NO_ORACLE,
            keccak256("GRANT_PERMISSION")
        );

        return (update, initData);
    }
}
