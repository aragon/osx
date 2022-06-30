// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title Proxy contract for UUPSUpgradeable
/// @author Aragon Association - 2022
/// @notice This contract is only meant to be used for deploy purposes
contract UUPSProxy is ERC1967Proxy {
    constructor(
        address _logic,
        address, // This is passed by hardhat deploy plugin, nor passed on to ERC1967Proxy. See: https://github.com/wighawag/hardhat-deploy/issues/146
        bytes memory _data
    ) payable ERC1967Proxy(_logic, _data) {}
}
