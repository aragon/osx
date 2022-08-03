// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./AppStorage.sol";

/// @title UUPSProxy
/// @author Giorgi Lagidze - Aragon Association - 2022
/// @notice This contract is only meant to be used for deploy purposes.
contract UUPSProxy is ERC1967Proxy, AppStorage {
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
