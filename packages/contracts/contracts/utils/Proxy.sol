
/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// Free Function Approach...

// @dev Internal helper method to create a proxy contract based on the passed base contract address
// @param _logic The address of the base contract
// @param _data The constructor arguments for this contract
// @return addr The address of the proxy contract created
function createProxy(address _logic, bytes memory _data) returns(address payable addr) {
    return payable(address(new ERC1967Proxy(_logic, _data)));
}
