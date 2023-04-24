// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

/// @param bitmap The `uint256` representation of bits.
/// @param index The index number to check whether 1 or 0 is set.
/// @return Returns `true` whether the bit is set at `index` on `bitmap`.
function hasBit(uint256 bitmap, uint8 index) pure returns (bool) {
    uint256 bitValue = bitmap & (1 << index);
    return bitValue > 0;
}

/// @param bitmap The `uint256` representation of bits.
/// @param index The index number to set the bit.
/// @return Returns a new number on which the bit is set at `index`.
function flipBit(uint256 bitmap, uint8 index) pure returns (uint256) {
    return bitmap ^ (1 << index);
}
