// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import "../../plugins/utils/Ratio.sol";

contract RatioTest {
    function getRatioBase() public pure returns (uint256) {
        return RATIO_BASE;
    }

    function applyRatioCeiled(uint256 _value, uint256 _ratio) public pure returns (uint256) {
        return _applyRatioCeiled(_value, _ratio);
    }
}
