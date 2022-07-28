// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

library Uint256Helpers {
    uint256 private constant MAX_UINT64 = type(uint64).max;

    /// @notice Thrown if the checked value exceeds the a limit.
    /// @param maxValue The maximum value.
    /// @param value The compared value.
    error OutOfBounds(uint256 maxValue, uint256 value);

    /// @notice Casts a `uint256` safely to `uint64` making sure is not out of the bounds.
    /// @param a The value to convert.
    function toUint64(uint256 a) internal pure returns (uint64) {
        if (a > MAX_UINT64) revert OutOfBounds({maxValue: MAX_UINT64, value: a});
        return uint64(a);
    }
}
