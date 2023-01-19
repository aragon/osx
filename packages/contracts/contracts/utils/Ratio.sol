// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

// @notice The base value being defined to encode ratios being real numbers on the interval `[0,1]` as integers on the interval `[0, 10**6]`
uint256 constant RATIO_BASE = 10 ** 6;

/// @notice Thrown if a ratio value exceeds the maximal value of `10**6`.
/// @param limit The maximal value.
/// @param actual The actual value.
error RatioOutOfBounds(uint256 limit, uint256 actual);

/// @notice Divides a ratio by `RATIO_BASE` and ceils the remainder.
/// @param _ratioValue The dividend to be divded by `RATIO_BASE`.
/// @return The quotient obtained after ceiling a potential remainder.
function ceilDivisionByRatio(uint256 _ratioValue) pure returns (uint256) {
    if (_ratioValue % RATIO_BASE != 0) {
        return (_ratioValue / RATIO_BASE) + 1;
    }
    return _ratioValue / RATIO_BASE;
}

/// @notice Divides a ratio by `RATIO_BASE` and floors the remainder, which is equivalent to dropping it.
/// @param _ratioValue The dividend to be divded by `RATIO_BASE`.
/// @return The quotient obtained.
function floorDivisionByRatio(uint256 _ratioValue) pure returns (uint256) {
    return _ratioValue / RATIO_BASE;
}
