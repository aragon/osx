// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../utils/Ratio.sol";

contract RatioTest {
    function getRatioBase() public pure returns (uint256) {
        return RATIO_BASE;
    }

    function applyRatioCeiled(uint256 _value, uint256 _ratio) public pure returns (uint256) {
        return _applyRatioCeiled(_value, _ratio);
    }

    function applyRatioFloored(uint256 _value, uint256 _ratio) public pure returns (uint256) {
        return _applyRatioFloored(_value, _ratio);
    }
}
