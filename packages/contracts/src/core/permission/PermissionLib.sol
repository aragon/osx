// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

/// @title PermissionLib
/// @author Aragon Association - 2021-2023
/// @notice A library containing objects for permission processing.
library PermissionLib {
    /// @notice The address zero to be used as condition address for permissions.
    address constant NO_CONDITION = address(0);

    enum Operation {
        Grant,
        Revoke,
        GrantWithCondition
    }

    ///
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
