// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

// import "../../../core/plugin/PluginClones.sol";
import "../../../core/plugin/PluginUUPSUpgradeable.sol";

// NON-Upgradeable
contract MultiplyHelper is PluginUUPSUpgradeable {
    bytes32 public constant MULTIPLY_PERMISSION_ID = keccak256("MULTIPLY_PERMISSION");

    function multiply(uint256 _a, uint256 _b)
        external
        view
        auth(MULTIPLY_PERMISSION_ID)
        returns (uint256)
    {
        return _a * _b;
    }
}
