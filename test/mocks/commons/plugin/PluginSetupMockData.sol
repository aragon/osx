// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {PermissionLib} from "@aragon/osx-commons-contracts/src/permission/PermissionLib.sol";

address constant NO_CONDITION = address(0);

error ConflictingValues();

/// @notice Creates a mock `MultiTargetPermission` array by converting a range of `uint160` values into `address` values.
/// @param rangeStart The start of the range.
/// @param rangeEnd The end of the range (that is not included).
/// @param op The permission operation type.
/// @return permissions The mock array of permissions.
/// @dev DO NOT USE IN PRODUCTION!
function mockPermissions(
    uint160 rangeStart,
    uint160 rangeEnd,
    PermissionLib.Operation op
) pure returns (PermissionLib.MultiTargetPermission[] memory permissions) {
    if (rangeStart > rangeEnd) revert ConflictingValues();

    permissions = new PermissionLib.MultiTargetPermission[](rangeEnd - rangeStart);

    for (uint160 i = rangeStart; i < rangeEnd; i++) {
        permissions[i - rangeStart] = PermissionLib.MultiTargetPermission({
            operation: op,
            where: address(i),
            who: address(i),
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("MOCK_PERMISSION")
        });
    }
}

/// @notice Creates a mock array of helper addresses of specified length by converting `uint160` values starting from 0 into `address` values.
/// @param len The length of the helper array.
/// @return helpers The mock array of helper addresses.
/// @dev DO NOT USE IN PRODUCTION!
function mockHelpers(uint160 len) pure returns (address[] memory helpers) {
    helpers = new address[](len);

    for (uint160 i = 0; i < len; i++) {
        helpers[i] = address(i);
    }
}
