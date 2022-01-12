/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

library Uint256Helpers {
    uint256 private constant MAX_UINT64 = type(uint64).max;

    string private constant ERROR_NUMBER_TOO_BIG = "UINT64_NUMBER_TOO_BIG";

    function toUint64(uint256 a) internal pure returns (uint64) {
        require(a <= MAX_UINT64, ERROR_NUMBER_TOO_BIG);
        return uint64(a);
    }
}
