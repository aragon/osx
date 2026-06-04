// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {VersionComparisonLib} from "../../../../../src/common/utils/versioning/VersionComparisonLib.sol";

/// @notice A mock contract containing functions to compare semantic version numbers.
/// @dev DO NOT USE IN PRODUCTION!
contract VersionComparisonLibMock {
    using VersionComparisonLib for uint8[3];

    function eq(uint8[3] memory lhs, uint8[3] memory rhs) public pure returns (bool) {
        return lhs.eq(rhs);
    }

    function neq(uint8[3] memory lhs, uint8[3] memory rhs) public pure returns (bool) {
        return lhs.neq(rhs);
    }

    function lt(uint8[3] memory lhs, uint8[3] memory rhs) public pure returns (bool) {
        return lhs.lt(rhs);
    }

    function lte(uint8[3] memory lhs, uint8[3] memory rhs) public pure returns (bool) {
        return lhs.lte(rhs);
    }

    function gt(uint8[3] memory lhs, uint8[3] memory rhs) public pure returns (bool) {
        return lhs.gt(rhs);
    }

    function gte(uint8[3] memory lhs, uint8[3] memory rhs) public pure returns (bool) {
        return lhs.gte(rhs);
    }
}
