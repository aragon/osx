// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

/// @notice Adds two unsigned integers without checking the result for overflow errors (using safe math).
/// @param a The first summand.
/// @param b The second summand.
/// @return The sum.
/// @custom:security-contact sirt@aragon.org
function _uncheckedAdd(uint256 a, uint256 b) pure returns (uint256) {
    unchecked {
        return a + b;
    }
}

/// @notice Subtracts two unsigned integers without checking the result for overflow errors (using safe math).
/// @param a The minuend.
/// @param b The subtrahend.
/// @return The difference.
/// @custom:security-contact sirt@aragon.org
function _uncheckedSub(uint256 a, uint256 b) pure returns (uint256) {
    unchecked {
        return a - b;
    }
}
