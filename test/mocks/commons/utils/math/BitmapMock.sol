// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {hasBit as _hasBit, flipBit as _flipBit} from "../../../../../src/common/utils/math/BitMap.sol";

/// @notice A mock contract containing functions manipulating bitmaps.
/// @dev DO NOT USE IN PRODUCTION!
contract BitmapMock {
    function hasBit(uint256 _bitmap, uint8 _index) public pure returns (bool) {
        return _hasBit(_bitmap, _index);
    }

    function flipBit(uint256 _bitmap, uint8 _index) public pure returns (uint256) {
        return _flipBit(_bitmap, _index);
    }
}
