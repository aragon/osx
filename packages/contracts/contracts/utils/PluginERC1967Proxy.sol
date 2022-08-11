// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./AppStorage.sol";

/// @title PluginERC1967Proxy
/// @notice This contract provides an [ERC-1967](https://eips.ethereum.org/EIPS/eip-1967) compatible proxy contract delegating calls to the implementation address.
/// @dev This proxy doesn't include the upgradability logic and assumes that implementation contracts are `UUPSUpgradable`. 
/// If you want the proxy to contain upgrade logic, you have to use `TransparentUpgradableProxy`.
contract PluginERC1967Proxy is ERC1967Proxy, AppStorage {

    /// @notice The constructor initializing the [ERC-1967](https://eips.ethereum.org/EIPS/eip-1967) proxy and setting the `IDAO` address if specified.
    /// @param _dao The DAO address to be stored.
    /// @param _logic The address of the logic contract containing the proxy is pointing to.
    /// @ param _data The data being passed in a delegatecall to `_logic` to initialize the storage (see [OZs `ERC1967Proxy.sol` docs](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/proxy/ERC1967/ERC1967Proxy.sol))
    constructor(
        address _dao,
        address _logic, 
        bytes memory _data
    ) ERC1967Proxy(_logic, _data) {
        if(_dao != address(0)) {
            setDAO(_dao);
        }
    }
    
}
