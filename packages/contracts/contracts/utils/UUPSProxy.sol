// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title UUPSProxy
/// @author Aragon Association - 2022
/// @notice This contract is only meant to be used for deploy purposes
/// TODO: Need to be fully tested, and decide to use the second address param as admin address.
contract UUPSProxy is ERC1967Proxy {
    constructor(
        address _logic,
        address, // This is passed by hardhat deploy plugin, and not passed on to ERC1967Proxy. See: https://github.com/wighawag/hardhat-deploy/issues/146
        bytes memory _data
    ) payable ERC1967Proxy(_logic, _data) {}
}
