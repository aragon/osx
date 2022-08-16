// SPDX-License-Identifier: MIT
 
pragma solidity 0.8.10;

import "../../../core/plugin/AragonPlugin.sol";

// NON-Upgradable
contract MultiplyHelper is AragonPlugin  {
    
    bytes32 public constant MULTIPLY_PERMISSION_ID = keccak256("MULTIPLY_PERMISSION");

    function multiply(uint a, uint b) external auth(MULTIPLY_PERMISSION_ID) returns (uint) {
        return a * b;
    }

}
