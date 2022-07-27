// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

/// @title BulkPermissionsLib
/// @author Aragon Association - 2021, 2022
/// @notice A library containing objects for bulk permission processing.
library BulkPermissionsLib {
    enum Operation {
        Grant,
        Revoke,
        MakeImmutable
    }

    struct Item {
        Operation operation;
        bytes32 permissionId;
        address who;
    }
}
