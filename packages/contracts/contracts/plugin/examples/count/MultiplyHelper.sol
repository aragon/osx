// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

// import "../../../core/plugin/PluginCloneable.sol";
import "../../../core/plugin/PluginUUPSUpgradeable.sol";

// NON-Upgradable
contract MultiplyHelper is PluginUUPSUpgradeable {
    bytes32 public constant MULTIPLY_PERMISSION_ID = keccak256("MULTIPLY_PERMISSION");

    function multiply(uint256 a, uint256 b)
        external
        auth(MULTIPLY_PERMISSION_ID)
        returns (uint256)
    {
        return a * b;
    }
}
