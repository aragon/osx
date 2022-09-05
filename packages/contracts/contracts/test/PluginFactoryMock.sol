// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.10;

import {Permission, PluginManager, PluginManagerLib } from "../plugin/PluginManager.sol";
import "./MajorityVotingMock.sol";
import "../utils/Proxy.sol";
// TODO:GIORGI
contract PluginManagerMock is PluginManager {
    using PluginManagerLib for PluginManagerLib.Data;

    event NewPluginDeployed(address dao, bytes params);

    address public basePluginAddress;

    constructor() {
        basePluginAddress = address(new MajorityVotingMock());
    }

    function _getInstallInstruction(PluginManagerLib.Data memory installation)
        internal
        view
        override
        returns (PluginManagerLib.Data memory)
    {

        installation.addPlugin(basePluginAddress, bytes(""));
    }

    function getImplementationAddress() public view virtual override returns (address) {
        return basePluginAddress;
    }

    function deployABI() external view virtual override returns (string memory) {
        return "";
    }
}
