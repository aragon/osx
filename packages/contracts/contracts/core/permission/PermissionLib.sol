// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

/// @title PermissionLib
/// @author Aragon Association - 2021, 2022
/// @notice A library containing objects for permission processing.
library PermissionLib {
    enum Operation {
        Grant,
        Revoke,
        GrantWithOracle
    }

    /// @notice Simple permission struct to represent a permission without `where` nor `filter`.
    struct SimplePermission {
        Operation operation;
        address who;
        bytes32 permissionId;
    }

    /// @notice Advanced permission struct to represent a permission with `where` and `filter`.
    struct AdvancedPermission {
        Operation operation;
        address where;
        address who;
        address oracle;
        bytes32 permissionId;
    }
}
