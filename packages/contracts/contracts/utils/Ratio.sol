// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

// @notice The base value being defined to encode ratios being real numbers on the interval `[0,1]` as integers on the interval `[0, 10**6]`
uint256 constant RATIO_BASE = 10 ** 6;

/// @notice Thrown if a ratio value exceeds the maximal value of `10**6`.
/// @param limit The maximal value.
/// @param actual The actual value.
error RatioOutOfBounds(uint256 limit, uint256 actual);
