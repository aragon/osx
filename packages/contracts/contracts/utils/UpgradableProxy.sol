// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./AppStorage.sol";

/// @title UpgradableProxy
/// @notice The proxy that delegates calls to the implementation address.
/// @dev This proxy doesn't include the upgradability logic and presumes
/// that implementation contracts are UUPSUpgradable... If you want the proxy
/// to contain upgrade logic, you have to use TransparentUpgradableProxy.
contract UpgradableProxy is ERC1967Proxy, AppStorage {
    constructor(
        address _dao,
        address _logic, 
        bytes memory _data
    ) ERC1967Proxy(_logic, _data) { // here data should also include function selector already (there's no other way )))
        if(_dao != address(0)) {
            setDAO(_dao);
        }
    }   
}
