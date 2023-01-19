// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

// @notice The base value being defined to encode ratios being real numbers on the interval `[0,1]` as integers on the interval `[0, 10**6]`
uint256 constant RATIO_BASE = 10 ** 6;

/// @notice Thrown if a ratio value exceeds the maximal value of `10**6`.
/// @param limit The maximal value.
/// @param actual The actual value.
error RatioOutOfBounds(uint256 limit, uint256 actual);

/// @notice Applys a ratio to a value and ceils the remainder.
/// @param _value The value to which the ratio is applied .
/// @param _ratio The ratio.
/// @return result The resulting value.
function applyRatioCeiled(uint256 _value, uint256 _ratio) pure returns (uint256 result) {
    _value = _value * _ratio;
    uint256 remainder = _value % RATIO_BASE;
    result = _value / RATIO_BASE;

    // Check if ceiling is needed
    if (remainder != 0) {
        ++result;
    }
}

/// @notice Applys a ratio to a value and floors the remainder.
/// @param _value The value to which the ratio is applied .
/// @param _ratio The ratio.
/// @return result The resulting value.
function applyRatioFloored(uint256 _value, uint256 _ratio) pure returns (uint256 result) {
    result = (_value * _ratio) / RATIO_BASE;
}
