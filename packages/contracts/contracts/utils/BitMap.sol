// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

/// @param allowFailureMap the uint256 representation of bits
/// @param index the index number to check whether 1 or 0 is set.
/// @return bool returns true whether the bit is set at `index` on `allowFailureMap`
function getIndex(uint256 allowFailureMap, uint256 index) pure returns (bool) {
    uint256 bitIndex = allowFailureMap & (1 << (index & 0xff));
    return bitIndex > 0;
}

/// @param allowFailureMap the uint256 representation of bits
/// @param index the index number to set the bit.
/// @return uint256 returns a new number on which the bit is set at `index`.
function setIndex(uint256 allowFailureMap, uint256 index) pure returns (uint256) {
    return allowFailureMap ^ (1 << (index & 0xff));
}
