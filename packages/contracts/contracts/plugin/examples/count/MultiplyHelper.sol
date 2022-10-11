// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

// import "../../../core/plugin/PluginClones.sol";
import "../../../core/plugin/Plugin.sol";

// NON-Upgradeable
contract MultiplyHelper is Plugin {
    bytes32 public constant MULTIPLY_PERMISSION_ID =
        0x293ab483515bb2dc32ac9b2dfb9c39ee4ea5571530c34de9864c3e5fa9ce787d;

    constructor(address _dao) Plugin(IDAO(_dao)) {}

    function multiply(uint256 _a, uint256 _b)
        external
        view
        auth(MULTIPLY_PERMISSION_ID)
        returns (uint256)
    {
        return _a * _b;
    }
}
