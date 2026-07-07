// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {PermissionLib} from "../../../src/common/permission/PermissionLib.sol";

/// @notice Direct tests for the `PermissionLib` data-only library in
/// `src/common/permission/PermissionLib.sol`.
///
/// No upstream TS coverage existed for this library (it has no executable
/// code, only constants/enums/structs). Locks the constants and struct
/// layouts so a future rename or reorder fails loudly here.
contract PermissionLibTest is Test {
    // -------------------------------------------------------------------------
    // NO_CONDITION constant
    // -------------------------------------------------------------------------

    function test_NO_CONDITION_isAddressZero() public pure {
        assertEq(PermissionLib.NO_CONDITION, address(0));
    }

    // -------------------------------------------------------------------------
    // Operation enum values
    // -------------------------------------------------------------------------

    function test_Operation_enumOrdinals() public pure {
        // The exact ordinal values are part of the on-wire encoding for
        // `applyMultiTargetPermissions` and `applySingleTargetPermissions`.
        // A future reorder of this enum would silently corrupt all callers.
        assertEq(uint256(PermissionLib.Operation.Grant), 0);
        assertEq(uint256(PermissionLib.Operation.Revoke), 1);
        assertEq(uint256(PermissionLib.Operation.GrantWithCondition), 2);
    }

    // -------------------------------------------------------------------------
    // Struct round-trips through abi.encode / abi.decode
    // -------------------------------------------------------------------------

    function test_SingleTargetPermission_abiRoundtrip() public pure {
        PermissionLib.SingleTargetPermission memory original = PermissionLib.SingleTargetPermission({
            operation: PermissionLib.Operation.Grant, who: address(0xBEEF), permissionId: keccak256("DUMMY_PERMISSION")
        });

        bytes memory encoded = abi.encode(original);
        PermissionLib.SingleTargetPermission memory decoded =
            abi.decode(encoded, (PermissionLib.SingleTargetPermission));

        assertEq(uint256(decoded.operation), uint256(original.operation));
        assertEq(decoded.who, original.who);
        assertEq(decoded.permissionId, original.permissionId);
    }

    function test_MultiTargetPermission_abiRoundtrip() public pure {
        PermissionLib.MultiTargetPermission memory original = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.GrantWithCondition,
            where: address(0xDEAD),
            who: address(0xBEEF),
            condition: address(0xCAFE),
            permissionId: keccak256("DUMMY_PERMISSION")
        });

        bytes memory encoded = abi.encode(original);
        PermissionLib.MultiTargetPermission memory decoded = abi.decode(encoded, (PermissionLib.MultiTargetPermission));

        assertEq(uint256(decoded.operation), uint256(original.operation));
        assertEq(decoded.where, original.where);
        assertEq(decoded.who, original.who);
        assertEq(decoded.condition, original.condition);
        assertEq(decoded.permissionId, original.permissionId);
    }

    function test_MultiTargetPermission_arrayRoundtrip() public pure {
        PermissionLib.MultiTargetPermission[] memory original = new PermissionLib.MultiTargetPermission[](2);
        original[0] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: address(0x1),
            who: address(0x2),
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("A")
        });
        original[1] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Revoke,
            where: address(0x3),
            who: address(0x4),
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("B")
        });

        bytes memory encoded = abi.encode(original);
        PermissionLib.MultiTargetPermission[] memory decoded =
            abi.decode(encoded, (PermissionLib.MultiTargetPermission[]));

        assertEq(decoded.length, 2);
        for (uint256 i = 0; i < 2; i++) {
            assertEq(uint256(decoded[i].operation), uint256(original[i].operation));
            assertEq(decoded[i].where, original[i].where);
            assertEq(decoded[i].who, original[i].who);
            assertEq(decoded[i].condition, original[i].condition);
            assertEq(decoded[i].permissionId, original[i].permissionId);
        }
    }
}
