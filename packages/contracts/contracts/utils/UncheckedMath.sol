// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

/// @notice Increments an unsigned integer by one without checking the result for overflow errors (using safe math).
/// @param i The number to be incremented.
/// @return The number incremented by one.
function _uncheckedIncrement(uint256 i) pure returns (uint256) {
    unchecked {
        ++i;
    }
    return i;
}

/// @notice Add two unsigned integers without checking the result for overflow errors (using safe math).
/// @param a The first summand.
/// @param b The second summand.
/// @return The sum.
function _uncheckedAdd(uint256 a, uint256 b) pure returns (uint256) {
    unchecked {
        return a + b;
    }
}

/// @notice Subtracts two unsigned integers without checking the result for overflow errors (using safe math).
/// @param a The minuend.
/// @param b The subtrahend.
/// @return The difference.
function _uncheckedSub(uint256 a, uint256 b) pure returns (uint256) {
    unchecked {
        return a - b;
    }
}
