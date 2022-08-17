// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "./PluginERC1967Proxy.sol";

/// @notice Free function to create a proxy contract based on the passed base contract address.
/// @param _logic The base contract address.
/// @param _data The constructor arguments for this contract.
/// @return addr The address of the proxy contract created.
/// @dev Initializes the upgradeable proxy with an initial implementation specified by _logic. If _data is non-empty, it’s used as data in a delegate call to _logic. This will typically be an encoded function call, and allows initializing the storage of the proxy like a Solidity constructor (see [OpenZepplin ERC1967Proxy-constructor](https://docs.openzeppelin.com/contracts/4.x/api/proxy#ERC1967Proxy-constructor-address-bytes-)).
function createProxy(address _dao, address _logic, bytes memory _data) returns (address payable addr) {
    return payable(address(new PluginERC1967Proxy(_dao == address(0) ? address(0) : _dao, _logic, _data)));
}
