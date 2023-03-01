// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @notice Free function to create a [ERC-1967](https://eips.ethereum.org/EIPS/eip-1967) proxy contract based on the passed base contract address.
/// @param _logic The base contract address.
/// @param _data The constructor arguments for this contract.
/// @return The address of the proxy contract created.
/// @dev Initializes the upgradeable proxy with an initial implementation specified by _logic. If _data is non-empty, it’s used as data in a delegate call to _logic. This will typically be an encoded function call, and allows initializing the storage of the proxy like a Solidity constructor (see [OpenZepplin ERC1967Proxy-constructor](https://docs.openzeppelin.com/contracts/4.x/api/proxy#ERC1967Proxy-constructor-address-bytes-)).
function createERC1967Proxy(address _logic, bytes memory _data) returns (address) {
    return address(new ERC1967Proxy(_logic, _data));
}
