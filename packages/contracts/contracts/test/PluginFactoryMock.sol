// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.10;

import "../plugin/PluginFactoryBase.sol";
import "./MajorityVotingMock.sol";
import "../utils/Proxy.sol";

contract PluginFactoryMock is PluginFactoryBase {
    event NewPluginDeployed(address dao, bytes params);

    constructor() {
        basePluginAddress = address(new MajorityVotingMock());
    }

    function deploy(address dao, bytes calldata params)
        external
        override
        returns (address packageAddress)
    {
        packageAddress = basePluginAddress;

        emit NewPluginDeployed(dao, params);

        return packageAddress;
    }
}
