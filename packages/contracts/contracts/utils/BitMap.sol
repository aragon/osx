// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

/// @param bitmap the uint256 representation of bits
/// @param index the index number to check whether 1 or 0 is set.
/// @return bool returns true whether the bit is set at `index` on `bitmap`
function hasBit(uint256 bitmap, uint8 index) pure returns (bool) {
    uint256 bitValue = bitmap & (1 << (index & 0xff));
    return bitValue > 0;
}

/// @param bitmap the uint256 representation of bits
/// @param index the index number to set the bit.
/// @return uint256 returns a new number on which the bit is set at `index`.
function setBit(uint256 bitmap, uint8 index) pure returns (uint256) {
    return bitmap ^ (1 << (index & 0xff));
}
