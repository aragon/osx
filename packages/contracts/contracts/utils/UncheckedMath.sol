/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

function _uncheckedIncrement(uint256 i) pure returns (uint256) {
    unchecked {
        ++i;
    }
    return i;
}

function _uncheckedAdd(uint256 a, uint256 b) pure returns (uint256) {
    unchecked {
        return a + b;
    }
}

function _uncheckedSub(uint256 a, uint256 b) pure returns (uint256) {
    unchecked {
        return a - b;
    }
}
