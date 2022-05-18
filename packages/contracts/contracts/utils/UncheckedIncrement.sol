/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

// Free Function Approach...

// @dev Internal helper methods for unchecked value increments.
// @param i The uint256 that need to be incremented.
// @return uin256 incremented without check.
function _uncheckedIncrement(uint256 i) pure returns (uint256) {
    unchecked {
        ++i;
    }
    return i;
}
