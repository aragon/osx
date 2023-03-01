// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

// The base value to encode real-valued ratios on the interval `[0,1]` as integers on the interval `[0, 10**6]`.
uint256 constant RATIO_BASE = 10 ** 6;

/// @notice Thrown if a ratio value exceeds the maximal value of `10**6`.
/// @param limit The maximal value.
/// @param actual The actual value.
error RatioOutOfBounds(uint256 limit, uint256 actual);

/// @notice Applies a ratio to a value and ceils the remainder.
/// @param _value The value to which the ratio is applied.
/// @param _ratio The ratio that must be in the interval `[0, 10**6]`.
/// @return result The resulting value.
function _applyRatioCeiled(uint256 _value, uint256 _ratio) pure returns (uint256 result) {
    if (_ratio > RATIO_BASE) {
        revert RatioOutOfBounds({limit: RATIO_BASE, actual: _ratio});
    }

    _value = _value * _ratio;
    uint256 remainder = _value % RATIO_BASE;
    result = _value / RATIO_BASE;

    // Check if ceiling is needed
    if (remainder != 0) {
        ++result;
    }
}
