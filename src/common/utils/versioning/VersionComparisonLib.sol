// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

/// @title VersionComparisonLib
/// @author Aragon X - 2023
/// @notice A library containing methods for [semantic version number](https://semver.org/spec/v2.0.0.html) comparison.
/// @custom:security-contact sirt@aragon.org
library VersionComparisonLib {
    /// @notice Equality comparator for two semantic version numbers.
    /// @param lhs The left-hand side semantic version number.
    /// @param rhs The right-hand side semantic version number.
    /// @return Whether the two numbers are equal or not.
    function eq(uint8[3] memory lhs, uint8[3] memory rhs) internal pure returns (bool) {
        if (lhs[0] != rhs[0]) return false;

        if (lhs[1] != rhs[1]) return false;

        if (lhs[2] != rhs[2]) return false;

        return true;
    }

    /// @notice Inequality comparator for two semantic version numbers.
    /// @param lhs The left-hand side semantic version number.
    /// @param rhs The right-hand side semantic version number.
    /// @return Whether the two numbers are inequal or not.
    function neq(uint8[3] memory lhs, uint8[3] memory rhs) internal pure returns (bool) {
        if (lhs[0] != rhs[0]) return true;

        if (lhs[1] != rhs[1]) return true;

        if (lhs[2] != rhs[2]) return true;

        return false;
    }

    /// @notice Less than comparator for two semantic version numbers.
    /// @param lhs The left-hand side semantic version number.
    /// @param rhs The right-hand side semantic version number.
    /// @return Whether the first number is less than the second number or not.
    function lt(uint8[3] memory lhs, uint8[3] memory rhs) internal pure returns (bool) {
        if (lhs[0] < rhs[0]) return true;
        if (lhs[0] > rhs[0]) return false;

        if (lhs[1] < rhs[1]) return true;
        if (lhs[1] > rhs[1]) return false;

        if (lhs[2] < rhs[2]) return true;

        return false;
    }

    /// @notice Less than or equal to comparator for two semantic version numbers.
    /// @param lhs The left-hand side semantic version number.
    /// @param rhs The right-hand side semantic version number.
    /// @return Whether the first number is less than or equal to the second number or not.
    function lte(uint8[3] memory lhs, uint8[3] memory rhs) internal pure returns (bool) {
        if (lhs[0] < rhs[0]) return true;
        if (lhs[0] > rhs[0]) return false;

        if (lhs[1] < rhs[1]) return true;
        if (lhs[1] > rhs[1]) return false;

        if (lhs[2] <= rhs[2]) return true;

        return false;
    }

    /// @notice Greater than comparator for two semantic version numbers.
    /// @param lhs The left-hand side semantic version number.
    /// @param rhs The right-hand side semantic version number.
    /// @return Whether the first number is greater than the second number or not.
    function gt(uint8[3] memory lhs, uint8[3] memory rhs) internal pure returns (bool) {
        if (lhs[0] > rhs[0]) return true;
        if (lhs[0] < rhs[0]) return false;

        if (lhs[1] > rhs[1]) return true;
        if (lhs[1] < rhs[1]) return false;

        if (lhs[2] > rhs[2]) return true;

        return false;
    }

    /// @notice Greater than or equal to comparator for two semantic version numbers.
    /// @param lhs The left-hand side semantic version number.
    /// @param rhs The right-hand side semantic version number.
    /// @return Whether the first number is greater than or equal to the second number or not.
    function gte(uint8[3] memory lhs, uint8[3] memory rhs) internal pure returns (bool) {
        if (lhs[0] > rhs[0]) return true;
        if (lhs[0] < rhs[0]) return false;

        if (lhs[1] > rhs[1]) return true;
        if (lhs[1] < rhs[1]) return false;

        if (lhs[2] >= rhs[2]) return true;

        return false;
    }
}
