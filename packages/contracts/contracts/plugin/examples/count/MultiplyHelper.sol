// SPDX-License-Identifier: MIT
 
pragma solidity 0.8.10;

// import "../../../core/plugin/PluginClones.sol";
import "../../../core/plugin/PluginUUPSUpgradeable.sol";

// NON-Upgradable
contract MultiplyHelper is PluginUUPSUpgradeable  {
    
    bytes32 public constant MULTIPLY_PERMISSION_ID = keccak256("MULTIPLY_PERMISSION");

    function multiply(uint a, uint b) external auth(MULTIPLY_PERMISSION_ID) returns (uint) {
        return a * b;
    }

}
