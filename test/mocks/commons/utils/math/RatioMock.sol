// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {RATIO_BASE, _applyRatioCeiled} from "@aragon/osx-commons-contracts/src/utils/math/Ratio.sol";

/// @notice A mock contract containing functions manipulating bitmaps.
/// @dev DO NOT USE IN PRODUCTION!
contract RatioMock {
    function getRatioBase() public pure returns (uint256) {
        return RATIO_BASE;
    }

    function applyRatioCeiled(uint256 _value, uint256 _ratio) public pure returns (uint256) {
        return _applyRatioCeiled(_value, _ratio);
    }
}
