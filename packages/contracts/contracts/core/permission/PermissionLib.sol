// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

/// @title PermissionLib
/// @author Aragon Association - 2021-2023
/// @notice A library containing objects for permission processing.
library PermissionLib {
    enum Operation {
        Grant,
        Revoke,
        GrantWithCondition
    }

    struct SingleTargetPermission {
        Operation operation;
        address who;
        bytes32 permissionId;
    }

    struct MultiTargetPermission {
        Operation operation;
        address where;
        address who;
        address condition;
        bytes32 permissionId;
    }
}
