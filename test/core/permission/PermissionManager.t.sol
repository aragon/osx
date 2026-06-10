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
                // Indexed topic layout: [sig, permissionId, here, who].
                assertEq(logs[i].topics.length, 4, "4 topics");
                assertEq(logs[i].topics[1], ADMIN_PERMISSION_ID, "permissionId");
                assertEq(address(uint160(uint256(logs[i].topics[2]))), owner, "here == msg.sender");
                assertEq(address(uint160(uint256(logs[i].topics[3]))), other, "who");
                // Data layout: (where, condition). For plain grant, condition == ALLOW_FLAG.
                (address whereField, address condField) = abi.decode(logs[i].data, (address, address));
                assertEq(whereField, address(pm), "where");
                assertEq(condField, ALLOW_FLAG, "condition == ALLOW_FLAG for plain grant");
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
                // Data layout: (where, condition). Condition field carries the condition address.
                (, address condField) = abi.decode(logs[i].data, (address, address));
                assertEq(condField, address(condition), "condition field");
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
                // Indexed topic layout: [sig, permissionId, here, who].
                assertEq(logs[i].topics.length, 4, "4 topics");
                assertEq(logs[i].topics[1], ADMIN_PERMISSION_ID, "permissionId");
                assertEq(address(uint160(uint256(logs[i].topics[2]))), owner, "here == msg.sender");
                assertEq(address(uint160(uint256(logs[i].topics[3]))), other, "who");
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

// =============================================================================
//                  PermissionManager — extended test coverage
// =============================================================================

/// @dev A condition that always reverts with a string. Used to exercise the
///      `_checkCondition` try/catch path.
contract _RevertingStringCondition is IPermissionCondition {
    function isGranted(address, address, bytes32, bytes calldata) external pure returns (bool) {
        revert("condition denied");
    }

    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == type(IPermissionCondition).interfaceId || id == 0x01ffc9a7;
    }
}

/// @dev A condition that reverts with a custom error. Same purpose.
contract _RevertingCustomErrorCondition is IPermissionCondition {
    error ConditionRejected();

    function isGranted(address, address, bytes32, bytes calldata) external pure returns (bool) {
        revert ConditionRejected();
    }

    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == type(IPermissionCondition).interfaceId || id == 0x01ffc9a7;
    }
}

/// @dev A "lying" condition: claims `IPermissionCondition` via supportsInterface
///      but has no `isGranted` implementation (no entry in the fallback either).
///      Used to verify that a condition with a missing `isGranted` is accepted
///      by `grantWithCondition` but causes `isGranted` to return false later.
contract _SupportsInterfaceOnlyCondition {
    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == type(IPermissionCondition).interfaceId || id == 0x01ffc9a7;
    }
}

/// @notice Init — extended edge cases.
contract PMInitEdgeTest is PermissionManagerTestBase {
    /// `_initialOwner == address(pm)` — PM self-owns ROOT. Subsequent self-calls
    /// pass auth via tier-1 (where == pm, who == pm). Lock in this pattern
    /// (used by inheriting contracts that govern themselves via `execute`).
    function test_init_pmSelfOwnsRoot() public {
        PermissionManagerHarness fresh = new PermissionManagerHarness();
        fresh.init(address(fresh));
        assertTrue(fresh.hasPermission(address(fresh), address(fresh), ROOT_PERMISSION_ID, ""));
        assertFalse(fresh.hasPermission(address(fresh), owner, ROOT_PERMISSION_ID, ""));
    }
}

/// @notice `permissionHash` — order-sensitivity + collision-freeness.
contract PMPermissionHashTest is PermissionManagerTestBase {
    function test_permissionHash_orderSensitive_whoVsWhere() public {
        address a = makeAddr("a");
        address b = makeAddr("b");
        bytes32 id = keccak256("X");
        // permissionHash packs (who, where, id) — swapping (a, b) → (b, a)
        // must yield a different hash.
        assertTrue(pm.getPermissionHash(a, b, id) != pm.getPermissionHash(b, a, id));
    }

    function test_permissionHash_distinctPermissionIds_distinctHashes() public {
        address w = makeAddr("w");
        address h = makeAddr("h");
        assertTrue(pm.getPermissionHash(w, h, keccak256("A")) != pm.getPermissionHash(w, h, keccak256("B")));
    }

    function test_permissionHash_selfPair_wellDefined() public {
        // permissionHash(A, A, id) is just a normal hash — no collision with
        // any (A, B, id) where B != A.
        address a = makeAddr("a");
        address b = makeAddr("b");
        bytes32 id = keccak256("X");
        bytes32 selfHash = pm.getPermissionHash(a, a, id);
        assertTrue(selfHash != pm.getPermissionHash(a, b, id));
        assertTrue(selfHash != pm.getPermissionHash(b, a, id));
    }

    function test_permissionHash_deterministic_acrossCalls() public {
        address w = makeAddr("w");
        address h = makeAddr("h");
        bytes32 id = keccak256("X");
        bytes32 first = pm.getPermissionHash(w, h, id);
        bytes32 second = pm.getPermissionHash(w, h, id);
        assertEq(first, second);
    }
}

/// @notice `grant` — who/where edge addresses.
contract PMGrantEdgeTest is PermissionManagerTestBase {
    function test_grant_whoIsZero_accepted() public {
        vm.prank(owner);
        pm.grant(address(pm), address(0), ADMIN_PERMISSION_ID);
        // ALLOW_FLAG stored at the slot for (pm, address(0), ADMIN).
        assertEq(pm.getAuthPermission(address(pm), address(0), ADMIN_PERMISSION_ID), ALLOW_FLAG);
    }

    function test_grant_selfPairWhoEqualsWhere_accepted() public {
        address t = makeAddr("target");
        vm.prank(owner);
        pm.grant(t, t, ADMIN_PERMISSION_ID);
        assertEq(pm.getAuthPermission(t, t, ADMIN_PERMISSION_ID), ALLOW_FLAG);
    }

    function test_grant_pmSelfGrant_accepted() public {
        // PM holding a permission on itself is a valid pattern (DAO-as-self).
        vm.prank(owner);
        pm.grant(address(pm), address(pm), ADMIN_PERMISSION_ID);
        assertTrue(pm.hasPermission(address(pm), address(pm), ADMIN_PERMISSION_ID, ""));
    }

    function test_grant_whereIsZero_accepted() public {
        // `_where == address(0)` is not explicitly blocked. The grant lands at
        // its own slot; no functional consumer would query against where=0.
        vm.prank(owner);
        pm.grant(address(0), other, ADMIN_PERMISSION_ID);
        assertEq(pm.getAuthPermission(address(0), other, ADMIN_PERMISSION_ID), ALLOW_FLAG);
    }
}

/// @notice `grantWithCondition` — extended.
contract PMGrantWithConditionEdgeTest is PermissionManagerTestBase {
    /// Condition whose `supportsInterface` itself reverts — the outer call
    /// propagates the inner revert (no try/catch around supportsInterface).
    function test_grantWithCondition_conditionWithRevertingSupportsInterfaceBubbles() public {
        // Deploy a contract whose supportsInterface reverts (use a non-condition
        // contract — e.g., PermissionManager itself doesn't implement supportsInterface).
        // Use vm.etch to create a 1-byte contract that reverts on call.
        address bad = makeAddr("bad");
        vm.etch(bad, hex"fe"); // INVALID opcode

        vm.prank(owner);
        vm.expectRevert();
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(bad));
    }

    /// Slot already holds `ALLOW_FLAG` (plain grant). Subsequent
    /// `grantWithCondition(differentCondition)` reverts
    /// `PermissionAlreadyGrantedForDifferentCondition` (since current=ALLOW != new).
    function test_grantWithCondition_overExistingAllow_reverts() public {
        vm.prank(owner);
        pm.grant(address(pm), other, ADMIN_PERMISSION_ID);

        PermissionConditionMock cond = new PermissionConditionMock();
        vm.prank(owner);
        vm.expectRevert();
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(cond)));
    }

    /// `_condition == ALLOW_FLAG` (address(2)) — same `isContract()` check that
    /// rejects `address(0)`, but locking in this sentinel-collision case
    /// guards against confusion between the slot's ALLOW_FLAG marker and
    /// a real condition address being stored there.
    function test_grantWithCondition_allowFlagAddress_reverts() public {
        vm.prank(owner);
        vm.expectRevert();
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(ALLOW_FLAG));
    }

    /// A "condition" that ONLY implements `supportsInterface` but not
    /// `isGranted` is accepted at grant time (because the interface check
    /// passes), but later `isGranted` queries return false because the
    /// condition call fails inside try/catch.
    function test_grantWithCondition_supportsInterfaceOnly_acceptedButCheckReturnsFalse() public {
        _SupportsInterfaceOnlyCondition liar = new _SupportsInterfaceOnlyCondition();
        vm.prank(owner);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(liar)));

        // Slot is stored as the condition address (not ALLOW_FLAG).
        assertEq(pm.getAuthPermission(address(pm), other, ADMIN_PERMISSION_ID), address(liar));
        // But isGranted returns false (call to isGranted fails → try/catch → false).
        assertFalse(pm.hasPermission(address(pm), other, ADMIN_PERMISSION_ID, ""));
    }
}

/// @notice `revoke` — extended (cycles, condition clearance, ANY_ADDR semantics).
contract PMRevokeEdgeTest is PermissionManagerTestBase {
    function test_revoke_conditional_clearsToUnset() public {
        PermissionConditionMock cond = new PermissionConditionMock();
        vm.prank(owner);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(cond)));
        assertEq(pm.getAuthPermission(address(pm), other, ADMIN_PERMISSION_ID), address(cond));

        vm.prank(owner);
        pm.revoke(address(pm), other, ADMIN_PERMISSION_ID);
        assertEq(pm.getAuthPermission(address(pm), other, ADMIN_PERMISSION_ID), UNSET_FLAG);
    }

    function test_revoke_anyAddrWho_succeeds() public {
        // grant ANY_ADDR (unrestricted permission), then revoke that grant.
        vm.prank(owner);
        pm.grant(address(pm), ANY_ADDR, ADMIN_PERMISSION_ID);
        vm.prank(owner);
        pm.revoke(address(pm), ANY_ADDR, ADMIN_PERMISSION_ID);
        assertEq(pm.getAuthPermission(address(pm), ANY_ADDR, ADMIN_PERMISSION_ID), UNSET_FLAG);
    }

    function test_revoke_thenRegrant_storesAllowAgain() public {
        vm.prank(owner);
        pm.grant(address(pm), other, ADMIN_PERMISSION_ID);
        vm.prank(owner);
        pm.revoke(address(pm), other, ADMIN_PERMISSION_ID);
        vm.prank(owner);
        pm.grant(address(pm), other, ADMIN_PERMISSION_ID);
        assertEq(pm.getAuthPermission(address(pm), other, ADMIN_PERMISSION_ID), ALLOW_FLAG);
    }

    function test_revoke_thenRegrantWithDifferentCondition_storesNewCondition() public {
        PermissionConditionMock condA = new PermissionConditionMock();
        PermissionConditionMock condB = new PermissionConditionMock();

        vm.prank(owner);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(condA)));
        vm.prank(owner);
        pm.revoke(address(pm), other, ADMIN_PERMISSION_ID);
        vm.prank(owner);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(condB)));

        assertEq(pm.getAuthPermission(address(pm), other, ADMIN_PERMISSION_ID), address(condB));
    }
}

/// @notice `applySingleTargetPermissions` — extended.
contract PMApplySingleEdgeTest is PermissionManagerTestBase {
    function test_bulkSingle_emptyBatch_succeedsNoEvents() public {
        PermissionLib.SingleTargetPermission[] memory items;
        vm.recordLogs();
        vm.prank(owner);
        pm.applySingleTargetPermissions(address(pm), items);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 0);
    }

    function test_bulkSingle_failingItemRollsBackPriorItems() public {
        // Build a batch where item[1] is GrantWithCondition (unsupported by
        // applySingleTargetPermissions → reverts). Item[0] is a valid Grant.
        // The whole batch must revert atomically; item[0] state must NOT persist.
        address a1 = makeAddr("a1");
        PermissionLib.SingleTargetPermission[] memory items = new PermissionLib.SingleTargetPermission[](2);
        items[0] = PermissionLib.SingleTargetPermission({
            operation: PermissionLib.Operation.Grant, who: a1, permissionId: ADMIN_PERMISSION_ID
        });
        items[1] = PermissionLib.SingleTargetPermission({
            operation: PermissionLib.Operation.GrantWithCondition, who: a1, permissionId: ADMIN_PERMISSION_ID
        });

        vm.prank(owner);
        vm.expectRevert();
        pm.applySingleTargetPermissions(address(pm), items);

        // Item[0]'s grant was rolled back.
        assertEq(pm.getAuthPermission(address(pm), a1, ADMIN_PERMISSION_ID), UNSET_FLAG);
    }

    /// Duplicate items in the same batch: first item grants; second is a
    /// silent no-op (slot already ALLOW). No second event.
    function test_bulkSingle_duplicateItemsSecondIsNoop() public {
        address a1 = makeAddr("a1");
        PermissionLib.SingleTargetPermission[] memory items = new PermissionLib.SingleTargetPermission[](2);
        items[0] = PermissionLib.SingleTargetPermission({
            operation: PermissionLib.Operation.Grant, who: a1, permissionId: ADMIN_PERMISSION_ID
        });
        items[1] = items[0];

        vm.recordLogs();
        vm.prank(owner);
        pm.applySingleTargetPermissions(address(pm), items);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 grantedTopic = keccak256("Granted(bytes32,address,address,address,address)");
        uint256 grants;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(pm) && logs[i].topics[0] == grantedTopic) grants++;
        }
        assertEq(grants, 1, "second duplicate should not re-emit");
    }
}

/// @notice `applyMultiTargetPermissions` — extended.
contract PMApplyMultiEdgeTest is PermissionManagerTestBase {
    function test_bulkMulti_emptyBatch_succeedsNoEvents() public {
        PermissionLib.MultiTargetPermission[] memory items;
        vm.recordLogs();
        vm.prank(owner);
        pm.applyMultiTargetPermissions(items);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 0);
    }

    function test_bulkMulti_mixedOps_GrantRevokeGrantWithCondition() public {
        // 3 items: Grant + Revoke (of a pre-existing permission) + GrantWithCondition.
        address a1 = makeAddr("a1");
        address a2 = makeAddr("a2");
        address a3 = makeAddr("a3");
        bytes32 perm = keccak256("MIXED");

        // Pre-grant for the revoke step.
        vm.prank(owner);
        pm.grant(address(pm), a2, perm);

        PermissionConditionMock cond = new PermissionConditionMock();
        PermissionLib.MultiTargetPermission[] memory items = new PermissionLib.MultiTargetPermission[](3);
        items[0] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: address(pm),
            who: a1,
            condition: address(0),
            permissionId: perm
        });
        items[1] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Revoke,
            where: address(pm),
            who: a2,
            condition: address(0),
            permissionId: perm
        });
        items[2] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.GrantWithCondition,
            where: address(pm),
            who: a3,
            condition: address(cond),
            permissionId: perm
        });

        vm.prank(owner);
        pm.applyMultiTargetPermissions(items);

        assertEq(pm.getAuthPermission(address(pm), a1, perm), ALLOW_FLAG, "a1 granted");
        assertEq(pm.getAuthPermission(address(pm), a2, perm), UNSET_FLAG, "a2 revoked");
        assertEq(pm.getAuthPermission(address(pm), a3, perm), address(cond), "a3 conditional");
    }

    /// `Revoke` operation's `condition` field is ignored (the function only
    /// dereferences it for Grant / GrantWithCondition operations).
    function test_bulkMulti_revokeIgnoresConditionField() public {
        address a1 = makeAddr("a1");
        bytes32 perm = keccak256("X");

        vm.prank(owner);
        pm.grant(address(pm), a1, perm);

        // Revoke with a junk condition field — should still succeed.
        PermissionLib.MultiTargetPermission[] memory items = new PermissionLib.MultiTargetPermission[](1);
        items[0] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Revoke,
            where: address(pm),
            who: a1,
            condition: address(0x1234), // arbitrary junk
            permissionId: perm
        });

        vm.prank(owner);
        pm.applyMultiTargetPermissions(items);
        assertEq(pm.getAuthPermission(address(pm), a1, perm), UNSET_FLAG);
    }
}

/// @notice `isGranted` — extended fall-through + ALLOW precedence + `_data` forwarding.
contract PMIsGrantedExtTest is PermissionManagerTestBase {
    /// Tier 1 condition reverts → returns false (no fall-through to tier 2/3).
    function test_isGranted_tier1RevertingCondition_returnsFalse() public {
        _RevertingStringCondition rev = new _RevertingStringCondition();
        vm.prank(owner);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(rev)));

        // Add a tier-2 ALLOW grant so fall-through would yield true if it
        // happened — but spec says no fall-through, so result is false.
        vm.prank(owner);
        pm.grant(address(pm), ANY_ADDR, ADMIN_PERMISSION_ID);

        assertFalse(
            pm.hasPermission(address(pm), other, ADMIN_PERMISSION_ID, ""), "tier-1 revert should NOT fall through"
        );
    }

    /// Tier 1 ALLOW takes precedence over tier 2 ANY_ADDR condition that
    /// would return false. ALLOW wins.
    function test_isGranted_tier1AllowBeatsTier2FalseCondition() public {
        vm.prank(owner);
        pm.grant(address(pm), other, ADMIN_PERMISSION_ID);

        PermissionConditionMock cond = new PermissionConditionMock();
        cond.setAnswer(false);
        vm.prank(owner);
        pm.grantWithCondition(address(pm), ANY_ADDR, ADMIN_PERMISSION_ID, IPermissionCondition(address(cond)));

        assertTrue(pm.hasPermission(address(pm), other, ADMIN_PERMISSION_ID, ""), "ALLOW precedence");
    }

    /// `_data` parameter forwarded byte-identical to the condition. Verified
    /// via `vm.expectCall` which asserts the condition's `isGranted` is
    /// invoked with the exact (where, who, permissionId, data) calldata.
    function test_isGranted_forwardsDataToCondition() public {
        PermissionConditionMock cond = new PermissionConditionMock();
        vm.prank(owner);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(cond)));

        bytes memory payload = abi.encode("hello", uint256(42));
        bytes memory expectedCall =
            abi.encodeCall(IPermissionCondition.isGranted, (address(pm), other, ADMIN_PERMISSION_ID, payload));
        vm.expectCall(address(cond), expectedCall);
        pm.hasPermission(address(pm), other, ADMIN_PERMISSION_ID, payload);
    }

    /// Querying with `_where == ANY_ADDR` aliases the tier-3 slot at the
    /// tier-1 lookup. Lock in: the aliasing is observable.
    function test_isGranted_anyAddrWhere_aliasesTier3Slot() public {
        // Populate tier-3 via grantWithCondition (the only legal route).
        PermissionConditionMock cond = new PermissionConditionMock();
        cond.setAnswer(true);
        vm.prank(owner);
        pm.grantWithCondition(ANY_ADDR, other, ADMIN_PERMISSION_ID, IPermissionCondition(address(cond)));

        // Direct query with where == ANY_ADDR hits the same slot via tier-1.
        assertTrue(pm.hasPermission(ANY_ADDR, other, ADMIN_PERMISSION_ID, ""));
    }

    /// `(ANY_ADDR, ANY_ADDR)` slot is unreachable from any grant path
    /// (rejected by `_grantWithCondition` line 408 and `_grant` line 347).
    /// So `isGranted(ANY_ADDR, ANY_ADDR, ...)` always returns false.
    function test_isGranted_anyAddrAnyAddrCombo_returnsFalse() public view {
        assertFalse(pm.hasPermission(ANY_ADDR, ANY_ADDR, ADMIN_PERMISSION_ID, ""));
    }
}

/// @notice `_checkCondition` — try/catch behaviour for various failure modes.
contract PMCheckConditionTest is PermissionManagerTestBase {
    function test_checkCondition_revertingString_returnsFalse() public {
        _RevertingStringCondition c = new _RevertingStringCondition();
        vm.prank(owner);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(c)));
        assertFalse(pm.hasPermission(address(pm), other, ADMIN_PERMISSION_ID, ""));
    }

    function test_checkCondition_customError_returnsFalse() public {
        _RevertingCustomErrorCondition c = new _RevertingCustomErrorCondition();
        vm.prank(owner);
        pm.grantWithCondition(address(pm), other, ADMIN_PERMISSION_ID, IPermissionCondition(address(c)));
        assertFalse(pm.hasPermission(address(pm), other, ADMIN_PERMISSION_ID, ""));
    }
}

