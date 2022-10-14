// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

/// @title PermissionLib
/// @author Aragon Association - 2021, 2022
/// @notice A library containing objects for permission processing.
library PermissionLib {
    enum Operation {
        Grant,
        Revoke,
        Freeze,
        GrantWithOracle
    }

    struct ItemSingleTarget {
        Operation operation;
        address who;
        bytes32 permissionId;
    }

    struct ItemMultiTarget {
        Operation operation;
        address where;
        address who;
        address oracle;
        bytes32 permissionId;
    }
}
