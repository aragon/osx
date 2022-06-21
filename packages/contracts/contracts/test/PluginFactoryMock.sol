// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.10;

import "../APM/IPluginFactory.sol";
import "./MajorityVotingMock.sol";
import "../utils/Proxy.sol";

contract PluginFactoryMock is IPluginFactory {
    event NewPulginDeployed(address dao, bytes params);

    constructor() {
        basePluginAddress = address(new MajorityVotingMock());
    }

    function deploy(address dao, bytes calldata params)
        external
        override
        returns (address packageAddress)
    {
        packageAddress = basePluginAddress;

        emit NewPulginDeployed(dao, params);

        return packageAddress;
    }
}
