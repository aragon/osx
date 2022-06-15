// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.10;

import "../APM/IPluginFactory.sol";

contract PluginFactoryMock is IPluginFactory {
    event NewPulginDeployed(address dao, bytes params);

    function deploy(address dao, bytes calldata params)
        external
        override
        returns (address packageAddress)
    {
        packageAddress = address(0);

        emit NewPulginDeployed(dao, params);

        return packageAddress;
    }
}
