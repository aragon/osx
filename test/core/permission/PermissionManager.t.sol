// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {PermissionManager} from "../../../src/core/permission/PermissionManager.sol";
import {PermissionLib} from "../../../src/common/permission/PermissionLib.sol";
import {IPermissionCondition} from "../../../src/common/permission/condition/IPermissionCondition.sol";
import {PermissionManagerTest as PermissionManagerHarness} from "../../mocks/permission/PermissionManagerTest.sol";
import {PermissionConditionMock} from "../../mocks/permission/PermissionConditionMock.sol";
import {PluginUUPSUpgradeableV1Mock} from "../../mocks/plugin/UUPSUpgradeable/PluginUUPSUpgradeableMock.sol";

/// @dev Shared setup for every PermissionManager test contract below.
abstract contract PermissionManagerTestBase is Test {
    bytes32 internal constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION");
    bytes32 internal constant ADMIN_PERMISSION_ID = keccak256("ADMIN_PERMISSION");
    bytes32 internal constant TEST_PERMISSION_1_ID = keccak256("TEST_PERMISSION_1");
    bytes32 internal constant TEST_PERMISSION_2_ID = keccak256("TEST_PERMISSION_2");
    address internal constant ANY_ADDR = address(type(uint160).max);
    address internal constant UNSET_FLAG = address(0);
    address internal constant ALLOW_FLAG = address(2);

    PermissionManagerHarness internal pm;
    address internal owner = makeAddr("owner");
    address internal other = makeAddr("other");

    function setUp() public virtual {
        pm = new PermissionManagerHarness();
        vm.prank(owner);
        pm.init(owner);
    }
}

/// @notice Ports the "init" describe block.
contract PermissionManagerInitTest is PermissionManagerTestBase {
    function test_init_revertsIfCalledTwice() public {
        vm.expectRevert("Initializable: contract is already initialized");
        pm.init(owner);
    }

    function test_init_emitsGrantedEventOnFreshDeploy() public {
        PermissionManagerHarness fresh = new PermissionManagerHarness();
        vm.recordLogs();
        vm.prank(owner);
        fresh.init(owner);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 grantedTopic = keccak256("Granted(bytes32,address,address,address,address)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(fresh) && logs[i].topics[0] == grantedTopic) {
                found = true;
                break;
            }
        }
        assertTrue(found, "Granted not emitted on init");
    }

    function test_init_grantsRootPermissionToInitialOwner() public view {
        assertEq(pm.getAuthPermission(address(pm), owner, ROOT_PERMISSION_ID), ALLOW_FLAG);
    }
}

/// @notice Ports the "grant" describe block.
contract PermissionManagerGrantTest is PermissionManagerTestBase {
    function test_grant_storesAllowFlag() public {
        vm.prank(owner);
        pm.grant(address(pm), other, ADMIN_PERMISSION_ID);
        assertEq(pm.getAuthPermission(address(pm), other, ADMIN_PERMISSION_ID), ALLOW_FLAG);
    }

    function test_grant_revertsIfBothWhoAndWhereAreAnyAddr() public {
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        vm.prank(owner);
        pm.grant(ANY_ADDR, ANY_ADDR, ROOT_PERMISSION_ID);
    }

    function test_grant_revertsIfPermissionRestrictedAndWhoIsAnyAddr() public {
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        vm.prank(owner);
        pm.grant(address(pm), ANY_ADDR, ROOT_PERMISSION_ID);
    }

    function test_grant_succeedsIfPermissionNotRestrictedAndWhoIsAnyAddr() public {
        vm.prank(owner);
        pm.grant(address(pm), ANY_ADDR, ADMIN_PERMISSION_ID);
        assertEq(pm.getAuthPermission(address(pm), ANY_ADDR, ADMIN_PERMISSION_ID), ALLOW_FLAG);
    }

    function test_grant_revertsIfPermissionRestrictedAndWhereIsAnyAddr() public {
        // `where == ANY_ADDR` is always disallowed via `_grant`.
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        vm.prank(owner);
        pm.grant(ANY_ADDR, address(pm), ROOT_PERMISSION_ID);
    }

    function test_grant_revertsIfNonRestrictedAndWhereIsAnyAddr() public {
        // Even unrestricted permissions cannot be granted with `where == ANY_ADDR`.
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        vm.prank(owner);
        pm.grant(ANY_ADDR, address(pm), ADMIN_PERMISSION_ID);
    }

    function test_grant_emitsGranted() public {
        vm.recordLogs();
        vm.prank(owner);
        pm.grant(address(pm), other, ADMIN_PERMISSION_ID);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 grantedTopic = keccak256("Granted(bytes32,address,address,address,address)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(pm) && logs[i].topics[0] == grantedTopic) {
                found = true;
                break;
            }
        }
        assertTrue(found, "Granted not emitted");
    }

    function test_grant_doesNotEmitGrantedIfAlreadyGranted() public {
        vm.prank(owner);
        pm.grant(address(pm), other, ADMIN_PERMISSION_ID);

        vm.recordLogs();
        vm.prank(owner);
        pm.grant(address(pm), other, ADMIN_PERMISSION_ID);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 grantedTopic = keccak256("Granted(bytes32,address,address,address,address)");
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(pm) && logs[i].topics[0] == grantedTopic) {
                revert("Granted unexpectedly emitted on idempotent grant");
            }
        }
    }

    function test_grant_revertsIfCallerLacksRootPermission() public {
        vm.expectRevert(
            abi.encodeWithSelector(PermissionManager.Unauthorized.selector, address(pm), other, ROOT_PERMISSION_ID)
        );
        vm.prank(other);
        pm.grant(address(pm), other, ADMIN_PERMISSION_ID);
    }

    function test_grant_revertsForNonRootCallerEvenWithOtherPermissions() public {
        vm.prank(owner);
        pm.grant(address(pm), other, ADMIN_PERMISSION_ID);

        vm.expectRevert(
            abi.encodeWithSelector(PermissionManager.Unauthorized.selector, address(pm), other, ROOT_PERMISSION_ID)
        );
        vm.prank(other);
        pm.grant(address(pm), other, ROOT_PERMISSION_ID);
    }
}

/// @notice Ports the "grantWithCondition" describe block.
contract PermissionManagerGrantWithConditionTest is PermissionManagerTestBase {
    PermissionConditionMock internal condition;

    function setUp() public override {
        super.setUp();
        condition = new PermissionConditionMock();
    }

    function test_grantWithCondition_revertsIfConditionIsNotContract() public {
        vm.expectRevert(
            abi.encodeWithSelector(PermissionManager.ConditionNotAContract.selector, IPermissionCondition(address(0)))
        );
        vm.prank(owner);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(0)));
    }

    function test_grantWithCondition_revertsIfConditionDoesNotSupportInterface() public {
        // A plugin contract — has `supportsInterface` but does NOT advertise IPermissionCondition.
        PluginUUPSUpgradeableV1Mock notACondition = new PluginUUPSUpgradeableV1Mock();
        vm.expectRevert(
            abi.encodeWithSelector(
                PermissionManager.ConditionInterfaceNotSupported.selector, IPermissionCondition(address(notACondition))
            )
        );
        vm.prank(owner);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(notACondition)));
    }

    function test_grantWithCondition_storesConditionAddress() public {
        vm.prank(owner);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(condition)));
        assertEq(pm.getAuthPermission(address(pm), other, ADMIN_PERMISSION_ID), address(condition));
    }

    function test_grantWithCondition_emitsGranted() public {
        vm.recordLogs();
        vm.prank(owner);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(condition)));
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 grantedTopic = keccak256("Granted(bytes32,address,address,address,address)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(pm) && logs[i].topics[0] == grantedTopic) {
                found = true;
                break;
            }
        }
        assertTrue(found, "Granted not emitted");
    }

    function test_grantWithCondition_emitsGrantedWhenAnyAddrOnWhoOrWhere() public {
        // `who == ANY_ADDR`
        vm.prank(owner);
        pm.grantWithCondition(address(pm), ANY_ADDR, ADMIN_PERMISSION_ID, IPermissionCondition(address(condition)));
        assertEq(pm.getAuthPermission(address(pm), ANY_ADDR, ADMIN_PERMISSION_ID), address(condition));

        // `where == ANY_ADDR` (different non-restricted permission for clarity)
        bytes32 otherPerm = keccak256("OTHER_PERMISSION");
        vm.prank(owner);
        pm.grantWithCondition(ANY_ADDR, address(pm), otherPerm, IPermissionCondition(address(condition)));
        assertEq(pm.getAuthPermission(ANY_ADDR, address(pm), otherPerm), address(condition));
    }

    function test_grantWithCondition_doesNotEmitIfAlreadyGrantedSameCondition() public {
        vm.prank(owner);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(condition)));

        vm.recordLogs();
        vm.prank(owner);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(condition)));
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 grantedTopic = keccak256("Granted(bytes32,address,address,address,address)");
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(pm) && logs[i].topics[0] == grantedTopic) {
                revert("Granted unexpectedly emitted on idempotent grantWithCondition");
            }
        }
    }

    function test_grantWithCondition_revertsIfSamePermissionGrantedWithDifferentCondition() public {
        vm.prank(owner);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(condition)));

        PermissionConditionMock newCondition = new PermissionConditionMock();
        vm.expectRevert(
            abi.encodeWithSelector(
                PermissionManager.PermissionAlreadyGrantedForDifferentCondition.selector,
                address(pm),
                other,
                ADMIN_PERMISSION_ID,
                address(condition),
                address(newCondition)
            )
        );
        vm.prank(owner);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(newCondition)));
    }

    function test_grantWithCondition_revertsForNonRootCaller() public {
        vm.expectRevert(
            abi.encodeWithSelector(PermissionManager.Unauthorized.selector, address(pm), other, ROOT_PERMISSION_ID)
        );
        vm.prank(other);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(condition)));
    }
}

/// @notice Ports the "revoke" describe block.
contract PermissionManagerRevokeTest is PermissionManagerTestBase {
    function test_revoke_clearsAuthFlag() public {
        vm.prank(owner);
        pm.grant(address(pm), other, ADMIN_PERMISSION_ID);
        vm.prank(owner);
        pm.revoke(address(pm), other, ADMIN_PERMISSION_ID);
        assertEq(pm.getAuthPermission(address(pm), other, ADMIN_PERMISSION_ID), UNSET_FLAG);
    }

    function test_revoke_emitsRevoked() public {
        vm.prank(owner);
        pm.grant(address(pm), other, ADMIN_PERMISSION_ID);

        vm.recordLogs();
        vm.prank(owner);
        pm.revoke(address(pm), other, ADMIN_PERMISSION_ID);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 revokedTopic = keccak256("Revoked(bytes32,address,address,address)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(pm) && logs[i].topics[0] == revokedTopic) {
                found = true;
                break;
            }
        }
        assertTrue(found, "Revoked not emitted");
    }

    function test_revoke_revertsForNonRootCaller() public {
        vm.prank(owner);
        pm.grant(address(pm), other, ADMIN_PERMISSION_ID);
        vm.expectRevert(
            abi.encodeWithSelector(PermissionManager.Unauthorized.selector, address(pm), other, ROOT_PERMISSION_ID)
        );
        vm.prank(other);
        pm.revoke(address(pm), other, ADMIN_PERMISSION_ID);
    }

    function test_revoke_doesNotEmitIfAlreadyRevoked() public {
        vm.prank(owner);
        pm.grant(address(pm), other, ADMIN_PERMISSION_ID);
        vm.prank(owner);
        pm.revoke(address(pm), other, ADMIN_PERMISSION_ID);

        vm.recordLogs();
        vm.prank(owner);
        pm.revoke(address(pm), other, ADMIN_PERMISSION_ID);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 revokedTopic = keccak256("Revoked(bytes32,address,address,address)");
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(pm) && logs[i].topics[0] == revokedTopic) {
                revert("Revoked unexpectedly emitted on idempotent revoke");
            }
        }
    }

    function test_revoke_unauthorizedFromUngrantedCaller() public {
        vm.expectRevert(
            abi.encodeWithSelector(PermissionManager.Unauthorized.selector, address(pm), other, ROOT_PERMISSION_ID)
        );
        vm.prank(other);
        pm.revoke(address(pm), other, ADMIN_PERMISSION_ID);
    }
}

/// @notice Ports the "bulk on multiple target" describe block.
contract PermissionManagerApplyMultiTargetTest is PermissionManagerTestBase {
    PermissionConditionMock internal condition;
    PermissionConditionMock internal condition2;

    address internal a1 = makeAddr("a1");
    address internal a2 = makeAddr("a2");
    address internal a3 = makeAddr("a3");

    function setUp() public override {
        super.setUp();
        condition = new PermissionConditionMock();
        condition2 = new PermissionConditionMock();
    }

    function _grantItem(address where, address who) internal view returns (PermissionLib.MultiTargetPermission memory) {
        return PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: where,
            who: who,
            condition: address(0),
            permissionId: ADMIN_PERMISSION_ID
        });
    }

    function _revokeItem(address where, address who)
        internal
        view
        returns (PermissionLib.MultiTargetPermission memory)
    {
        return PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Revoke,
            where: where,
            who: who,
            condition: address(0),
            permissionId: ADMIN_PERMISSION_ID
        });
    }

    function test_bulkMulti_grantsAcrossDifferentTargets() public {
        PermissionLib.MultiTargetPermission[] memory items = new PermissionLib.MultiTargetPermission[](2);
        items[0] = _grantItem(a1, a2);
        items[1] = _grantItem(a2, a3);

        vm.prank(owner);
        pm.applyMultiTargetPermissions(items);

        assertEq(pm.getAuthPermission(a1, a2, ADMIN_PERMISSION_ID), ALLOW_FLAG);
        assertEq(pm.getAuthPermission(a2, a3, ADMIN_PERMISSION_ID), ALLOW_FLAG);
    }

    function test_bulkMulti_revokesAcrossDifferentTargets() public {
        vm.prank(owner);
        pm.grant(a1, owner, ADMIN_PERMISSION_ID);
        vm.prank(owner);
        pm.grant(a2, owner, ADMIN_PERMISSION_ID);

        PermissionLib.MultiTargetPermission[] memory items = new PermissionLib.MultiTargetPermission[](2);
        items[0] = _revokeItem(a1, owner);
        items[1] = _revokeItem(a2, owner);

        vm.prank(owner);
        pm.applyMultiTargetPermissions(items);

        assertEq(pm.getAuthPermission(a1, owner, ADMIN_PERMISSION_ID), UNSET_FLAG);
        assertEq(pm.getAuthPermission(a2, owner, ADMIN_PERMISSION_ID), UNSET_FLAG);
    }

    function test_bulkMulti_revertsIfNonZeroConditionWithGrantOperation() public {
        PermissionLib.MultiTargetPermission[] memory items = new PermissionLib.MultiTargetPermission[](1);
        items[0] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: a1,
            who: owner,
            condition: address(condition),
            permissionId: ADMIN_PERMISSION_ID
        });
        vm.expectRevert(PermissionManager.GrantWithConditionNotSupported.selector);
        vm.prank(owner);
        pm.applyMultiTargetPermissions(items);
    }

    function test_bulkMulti_grantsWithCondition() public {
        PermissionLib.MultiTargetPermission[] memory items = new PermissionLib.MultiTargetPermission[](2);
        items[0] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.GrantWithCondition,
            where: a1,
            who: owner,
            condition: address(condition),
            permissionId: ADMIN_PERMISSION_ID
        });
        items[1] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.GrantWithCondition,
            where: a2,
            who: owner,
            condition: address(condition2),
            permissionId: ADMIN_PERMISSION_ID
        });

        vm.prank(owner);
        pm.applyMultiTargetPermissions(items);

        assertEq(pm.getAuthPermission(a1, owner, ADMIN_PERMISSION_ID), address(condition));
        assertEq(pm.getAuthPermission(a2, owner, ADMIN_PERMISSION_ID), address(condition2));
    }

    function test_bulkMulti_revertsForNonRootCaller() public {
        PermissionLib.MultiTargetPermission[] memory items = new PermissionLib.MultiTargetPermission[](1);
        items[0] = _grantItem(a1, owner);
        vm.expectRevert(
            abi.encodeWithSelector(PermissionManager.Unauthorized.selector, address(pm), other, ROOT_PERMISSION_ID)
        );
        vm.prank(other);
        pm.applyMultiTargetPermissions(items);
    }
}

/// @notice Ports the "bulk on single target" describe block.
contract PermissionManagerApplySingleTargetTest is PermissionManagerTestBase {
    address internal a1 = makeAddr("a1");
    address internal a2 = makeAddr("a2");
    address internal a3 = makeAddr("a3");

    function _grantItem(address who) internal view returns (PermissionLib.SingleTargetPermission memory) {
        return PermissionLib.SingleTargetPermission({
            operation: PermissionLib.Operation.Grant, who: who, permissionId: ADMIN_PERMISSION_ID
        });
    }

    function _revokeItem(address who) internal view returns (PermissionLib.SingleTargetPermission memory) {
        return PermissionLib.SingleTargetPermission({
            operation: PermissionLib.Operation.Revoke, who: who, permissionId: ADMIN_PERMISSION_ID
        });
    }

    function test_bulkSingle_grantsToManyOnSameTarget() public {
        PermissionLib.SingleTargetPermission[] memory items = new PermissionLib.SingleTargetPermission[](3);
        items[0] = _grantItem(a1);
        items[1] = _grantItem(a2);
        items[2] = _grantItem(a3);

        vm.prank(owner);
        pm.applySingleTargetPermissions(address(pm), items);

        assertEq(pm.getAuthPermission(address(pm), a1, ADMIN_PERMISSION_ID), ALLOW_FLAG);
        assertEq(pm.getAuthPermission(address(pm), a2, ADMIN_PERMISSION_ID), ALLOW_FLAG);
        assertEq(pm.getAuthPermission(address(pm), a3, ADMIN_PERMISSION_ID), ALLOW_FLAG);
    }

    function test_bulkSingle_revokesFromManyOnSameTarget() public {
        vm.prank(owner);
        pm.grant(address(pm), a1, ADMIN_PERMISSION_ID);
        vm.prank(owner);
        pm.grant(address(pm), a2, ADMIN_PERMISSION_ID);
        vm.prank(owner);
        pm.grant(address(pm), a3, ADMIN_PERMISSION_ID);

        PermissionLib.SingleTargetPermission[] memory items = new PermissionLib.SingleTargetPermission[](3);
        items[0] = _revokeItem(a1);
        items[1] = _revokeItem(a2);
        items[2] = _revokeItem(a3);

        vm.prank(owner);
        pm.applySingleTargetPermissions(address(pm), items);

        assertEq(pm.getAuthPermission(address(pm), a1, ADMIN_PERMISSION_ID), UNSET_FLAG);
        assertEq(pm.getAuthPermission(address(pm), a2, ADMIN_PERMISSION_ID), UNSET_FLAG);
        assertEq(pm.getAuthPermission(address(pm), a3, ADMIN_PERMISSION_ID), UNSET_FLAG);
    }

    function test_bulkSingle_revertsOnGrantWithCondition() public {
        PermissionLib.SingleTargetPermission[] memory items = new PermissionLib.SingleTargetPermission[](1);
        items[0] = PermissionLib.SingleTargetPermission({
            operation: PermissionLib.Operation.GrantWithCondition, who: a1, permissionId: ADMIN_PERMISSION_ID
        });
        vm.expectRevert(PermissionManager.GrantWithConditionNotSupported.selector);
        vm.prank(owner);
        pm.applySingleTargetPermissions(address(pm), items);
    }

    function test_bulkSingle_mixedGrantAndRevoke() public {
        vm.prank(owner);
        pm.grant(address(pm), a1, ADMIN_PERMISSION_ID);

        PermissionLib.SingleTargetPermission[] memory items = new PermissionLib.SingleTargetPermission[](2);
        items[0] = _revokeItem(a1);
        items[1] = _grantItem(a2);

        vm.prank(owner);
        pm.applySingleTargetPermissions(address(pm), items);

        assertEq(pm.getAuthPermission(address(pm), a1, ADMIN_PERMISSION_ID), UNSET_FLAG);
        assertEq(pm.getAuthPermission(address(pm), a2, ADMIN_PERMISSION_ID), ALLOW_FLAG);
    }

    function test_bulkSingle_emitsBothGrantedAndRevoked() public {
        vm.prank(owner);
        pm.grant(address(pm), a1, ADMIN_PERMISSION_ID);

        PermissionLib.SingleTargetPermission[] memory items = new PermissionLib.SingleTargetPermission[](2);
        items[0] = _revokeItem(a1);
        items[1] = _grantItem(a2);

        vm.recordLogs();
        vm.prank(owner);
        pm.applySingleTargetPermissions(address(pm), items);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 grantedTopic = keccak256("Granted(bytes32,address,address,address,address)");
        bytes32 revokedTopic = keccak256("Revoked(bytes32,address,address,address)");
        bool sawGranted;
        bool sawRevoked;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter != address(pm)) continue;
            if (logs[i].topics[0] == grantedTopic) sawGranted = true;
            if (logs[i].topics[0] == revokedTopic) sawRevoked = true;
        }
        assertTrue(sawGranted, "Granted not emitted");
        assertTrue(sawRevoked, "Revoked not emitted");
    }

    function test_bulkSingle_revertsForNonRootCaller() public {
        PermissionLib.SingleTargetPermission[] memory items = new PermissionLib.SingleTargetPermission[](1);
        items[0] = _grantItem(other);
        vm.expectRevert(
            abi.encodeWithSelector(PermissionManager.Unauthorized.selector, address(pm), other, ROOT_PERMISSION_ID)
        );
        vm.prank(other);
        pm.applySingleTargetPermissions(address(pm), items);
    }
}

/// @notice Ports the "isGranted" describe block.
contract PermissionManagerIsGrantedTest is PermissionManagerTestBase {
    function test_isGranted_trueForGrantedUser() public {
        vm.prank(owner);
        pm.grant(address(pm), other, ADMIN_PERMISSION_ID);
        assertTrue(pm.hasPermission(address(pm), other, ADMIN_PERMISSION_ID, ""));
    }

    function test_isGranted_falseIfNotGranted() public view {
        assertFalse(pm.hasPermission(address(pm), other, ADMIN_PERMISSION_ID, ""));
    }

    function test_isGranted_trueForSpecificConditionAnsweringTrue() public {
        PermissionConditionMock cond = new PermissionConditionMock();
        vm.prank(owner);
        pm.grantWithCondition(address(pm), owner, ADMIN_PERMISSION_ID, IPermissionCondition(address(cond)));
        cond.setAnswer(true);
        assertTrue(pm.hasPermission(address(pm), owner, ADMIN_PERMISSION_ID, ""));
    }

    function test_isGranted_trueForGenericCallerConditionAnsweringTrue() public {
        PermissionConditionMock cond = new PermissionConditionMock();
        vm.prank(owner);
        pm.grantWithCondition(address(pm), ANY_ADDR, ADMIN_PERMISSION_ID, IPermissionCondition(address(cond)));
        cond.setAnswer(true);

        assertTrue(pm.hasPermission(address(pm), owner, ADMIN_PERMISSION_ID, ""));
        assertTrue(pm.hasPermission(address(pm), other, ADMIN_PERMISSION_ID, ""));
        // Different target → no grant matches → false.
        assertFalse(pm.hasPermission(address(0), owner, ADMIN_PERMISSION_ID, ""));
    }

    function test_isGranted_trueForGenericTargetConditionAnsweringTrue() public {
        PermissionConditionMock cond = new PermissionConditionMock();
        vm.prank(owner);
        pm.grantWithCondition(ANY_ADDR, owner, ADMIN_PERMISSION_ID, IPermissionCondition(address(cond)));
        cond.setAnswer(true);

        assertTrue(pm.hasPermission(address(pm), owner, ADMIN_PERMISSION_ID, ""));
        assertTrue(pm.hasPermission(address(0), owner, ADMIN_PERMISSION_ID, ""));
        // Different caller → no grant matches → false.
        assertFalse(pm.hasPermission(address(0), other, ADMIN_PERMISSION_ID, ""));
    }

    function test_isGranted_callableByAnyone() public {
        // `isGranted` is `public view` — anyone can call.
        vm.prank(other);
        assertFalse(pm.hasPermission(address(pm), other, ADMIN_PERMISSION_ID, ""));
    }

    function test_isGranted_specificConditionFalseDoesNotFallBackToGeneric() public {
        PermissionConditionMock specific = new PermissionConditionMock();
        PermissionConditionMock genericCaller = new PermissionConditionMock();
        PermissionConditionMock genericTarget = new PermissionConditionMock();

        vm.startPrank(owner);
        pm.grantWithCondition(address(pm), owner, ADMIN_PERMISSION_ID, IPermissionCondition(address(specific)));
        pm.grantWithCondition(address(pm), ANY_ADDR, ADMIN_PERMISSION_ID, IPermissionCondition(address(genericCaller)));
        pm.grantWithCondition(ANY_ADDR, owner, ADMIN_PERMISSION_ID, IPermissionCondition(address(genericTarget)));
        vm.stopPrank();

        specific.setAnswer(false);
        genericCaller.setAnswer(true);
        genericTarget.setAnswer(true);

        // Specific match → no fallback → false.
        assertFalse(pm.hasPermission(address(pm), owner, ADMIN_PERMISSION_ID, ""));
        // Different target — only the genericTarget grant matches → true.
        assertTrue(pm.hasPermission(address(0), owner, ADMIN_PERMISSION_ID, ""));
    }

    function test_isGranted_genericCallerFalseDoesNotFallBackToGenericTarget() public {
        PermissionConditionMock genericCaller = new PermissionConditionMock();
        PermissionConditionMock genericTarget = new PermissionConditionMock();

        vm.startPrank(owner);
        pm.grantWithCondition(address(pm), ANY_ADDR, ADMIN_PERMISSION_ID, IPermissionCondition(address(genericCaller)));
        pm.grantWithCondition(ANY_ADDR, owner, ADMIN_PERMISSION_ID, IPermissionCondition(address(genericTarget)));
        vm.stopPrank();

        genericCaller.setAnswer(false);
        genericTarget.setAnswer(true);

        // For (pm, owner): genericCaller matches and answers false → no fallback → false.
        assertFalse(pm.hasPermission(address(pm), owner, ADMIN_PERMISSION_ID, ""));
        // For (pm, other): genericCaller matches and answers false → false.
        assertFalse(pm.hasPermission(address(pm), other, ADMIN_PERMISSION_ID, ""));
        // For (address(0), owner): no specific or generic caller match → falls to generic target → true.
        assertTrue(pm.hasPermission(address(0), owner, ADMIN_PERMISSION_ID, ""));
        // For (address(0), other): no match anywhere → false.
        assertFalse(pm.hasPermission(address(0), other, ADMIN_PERMISSION_ID, ""));
    }

    function test_isGranted_trueIfPermissionGrantedToAnyAddr() public {
        vm.prank(owner);
        pm.grant(address(pm), ANY_ADDR, ADMIN_PERMISSION_ID);
        assertTrue(pm.hasPermission(address(pm), other, ADMIN_PERMISSION_ID, ""));
    }
}

/// @notice Ports the "_hasPermission" and "helpers" describe blocks.
contract PermissionManagerHelpersTest is PermissionManagerTestBase {
    function test_isGranted_callsConditionIsGrantedAndFlipsWithAnswer() public {
        PermissionConditionMock cond = new PermissionConditionMock();
        vm.prank(owner);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(cond)));

        assertTrue(pm.hasPermission(address(pm), other, ADMIN_PERMISSION_ID, ""));
        cond.setAnswer(false);
        assertFalse(pm.hasPermission(address(pm), other, ADMIN_PERMISSION_ID, ""));
    }

    function test_permissionHash_matchesKeccakOfCanonicalPacking() public view {
        bytes32 expected = keccak256(abi.encodePacked("PERMISSION", owner, address(pm), ROOT_PERMISSION_ID));
        assertEq(pm.getPermissionHash(address(pm), owner, ROOT_PERMISSION_ID), expected);
    }
}
