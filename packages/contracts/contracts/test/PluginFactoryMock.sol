// // SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.10;

import "../plugin/PluginManager.sol";
import "./MajorityVotingMock.sol";
import "../utils/Proxy.sol";

contract PluginManagerMock is PluginManager {
    event NewPluginDeployed(address dao, bytes params);

    address public basePluginAddress;

    constructor() {
        basePluginAddress = address(new MajorityVotingMock());
    }

    function deploy(address dao, bytes calldata params)
        external
        override
        returns (address plugin, address[] memory relatedContracts)
    {
        plugin = basePluginAddress;

        emit NewPluginDeployed(dao, params);
    }

    function getImplementationAddress() public view virtual override returns (address) {
        return basePluginAddress;
    }

    function deployABI() external view virtual override returns (string memory) {
        return "";
    }

    function getInstallPermissions(bytes memory data)
        external
        view
        virtual
        override
        returns (RequestedPermission[] memory, string[] memory)
    {}
}
