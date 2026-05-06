// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {PluginRepo} from "../../../../src/framework/plugin/repo/PluginRepo.sol";
import {PermissionManager} from "../../../../src/core/permission/PermissionManager.sol";
import {IPermissionCondition} from "../../../../src/common/permission/condition/IPermissionCondition.sol";
import {PermissionConditionMock} from "../../../mocks/permission/PermissionConditionMock.sol";

/// @notice Regression coverage for finding C-2: `PluginRepo` must override
/// `isPermissionRestrictedForAnyAddr` so that the dangerous `MAINTAINER` and
/// `UPGRADE_REPO` permissions cannot be granted to `ANY_ADDR`. Mirrors the
/// `DAO.sol` defense-in-depth pattern.
contract PluginRepoAnyAddrRestrictionTest is Test {
    address internal constant ANY_ADDR = address(type(uint160).max);

    bytes32 internal constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION");
    bytes32 internal constant MAINTAINER_PERMISSION_ID = keccak256("MAINTAINER_PERMISSION");
    bytes32 internal constant UPGRADE_REPO_PERMISSION_ID = keccak256("UPGRADE_REPO_PERMISSION");
    // An arbitrary permission that is NOT in the restricted set — used to
    // confirm the override is selective rather than a blanket lock-out.
    bytes32 internal constant CUSTOM_PERMISSION_ID = keccak256("CUSTOM_PERMISSION");

    PluginRepo internal repo;

    address internal maintainer = address(0xBEEF);
    address internal upgrader = address(0xC0FFEE);
    address internal stranger = address(0xBAD);

    function setUp() public {
        // Deploy the repo behind a UUPS proxy with this test contract as the
        // initial owner. `PluginRepo.initialize` grants ROOT, MAINTAINER, and
        // UPGRADE_REPO to the initial owner — so this contract can call
        // `grant`/`grantWithCondition` directly.
        PluginRepo impl = new PluginRepo();
        repo = PluginRepo(
            address(new ERC1967Proxy(address(impl), abi.encodeCall(PluginRepo.initialize, (address(this)))))
        );
    }

    // -------------------------------------------------------------------------
    // C-2 regression — bare grants to ANY_ADDR
    // -------------------------------------------------------------------------

    function test_C2_GrantMaintainerToAnyAddr_Reverts() public {
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        repo.grant(address(repo), ANY_ADDR, MAINTAINER_PERMISSION_ID);
    }

    function test_C2_GrantUpgradeRepoToAnyAddr_Reverts() public {
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        repo.grant(address(repo), ANY_ADDR, UPGRADE_REPO_PERMISSION_ID);
    }

    // -------------------------------------------------------------------------
    // C-2 regression — conditional grants to ANY_ADDR
    // -------------------------------------------------------------------------
    //
    // The same restriction applies to `grantWithCondition` because
    // `PermissionManager._grantWithCondition` consults the same
    // `isPermissionRestrictedForAnyAddr` hook (see `PermissionManager.sol:412-419`).

    function test_C2_GrantWithConditionMaintainerToAnyAddr_Reverts() public {
        PermissionConditionMock cond = new PermissionConditionMock();
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        repo.grantWithCondition(address(repo), ANY_ADDR, MAINTAINER_PERMISSION_ID, IPermissionCondition(address(cond)));
    }

    function test_C2_GrantWithConditionUpgradeRepoToAnyAddr_Reverts() public {
        PermissionConditionMock cond = new PermissionConditionMock();
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        repo.grantWithCondition(
            address(repo), ANY_ADDR, UPGRADE_REPO_PERMISSION_ID, IPermissionCondition(address(cond))
        );
    }

    // -------------------------------------------------------------------------
    // ROOT to ANY_ADDR is already blocked by the base `PermissionManager._grant`
    // — guard against an accidental loosening when the override is added.
    // -------------------------------------------------------------------------

    function test_C2_GrantRootToAnyAddr_StillReverts() public {
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        repo.grant(address(repo), ANY_ADDR, ROOT_PERMISSION_ID);
    }

    // -------------------------------------------------------------------------
    // The override is selective: permissions outside the restricted set must
    // continue to support `ANY_ADDR` (otherwise the override would be a
    // blanket lock-out and would break legitimate downstream patterns).
    // -------------------------------------------------------------------------

    function test_C2_GrantOtherPermissionToAnyAddr_StillSucceeds() public {
        repo.grant(address(repo), ANY_ADDR, CUSTOM_PERMISSION_ID);
        // `isGranted` against a stranger should now return true via the
        // `ANY_ADDR` lookup path in `PermissionManager.isGranted`.
        assertTrue(
            repo.isGranted(address(repo), stranger, CUSTOM_PERMISSION_ID, bytes("")),
            "Non-restricted permission must still flow through ANY_ADDR."
        );
    }

    // -------------------------------------------------------------------------
    // Happy path: specific-address grants of the now-restricted permissions
    // continue to work. Confirms the fix only narrows ANY_ADDR, not specific
    // grants — otherwise legitimate maintainer onboarding would break.
    // -------------------------------------------------------------------------

    function test_C2_GrantMaintainerToSpecificAddress_StillSucceeds() public {
        repo.grant(address(repo), maintainer, MAINTAINER_PERMISSION_ID);
        assertTrue(
            repo.isGranted(address(repo), maintainer, MAINTAINER_PERMISSION_ID, bytes("")),
            "Specific MAINTAINER grant must succeed."
        );
        // Non-grantee must NOT inherit the permission via ANY_ADDR.
        assertFalse(
            repo.isGranted(address(repo), stranger, MAINTAINER_PERMISSION_ID, bytes("")),
            "Stranger must not have MAINTAINER without an explicit grant."
        );
    }

    function test_C2_GrantUpgradeRepoToSpecificAddress_StillSucceeds() public {
        repo.grant(address(repo), upgrader, UPGRADE_REPO_PERMISSION_ID);
        assertTrue(
            repo.isGranted(address(repo), upgrader, UPGRADE_REPO_PERMISSION_ID, bytes("")),
            "Specific UPGRADE_REPO grant must succeed."
        );
        assertFalse(
            repo.isGranted(address(repo), stranger, UPGRADE_REPO_PERMISSION_ID, bytes("")),
            "Stranger must not have UPGRADE_REPO without an explicit grant."
        );
    }

    function test_C2_GrantWithConditionMaintainerToSpecificAddress_StillSucceeds() public {
        PermissionConditionMock cond = new PermissionConditionMock();
        cond.setAnswer(true);
        repo.grantWithCondition(
            address(repo), maintainer, MAINTAINER_PERMISSION_ID, IPermissionCondition(address(cond))
        );
        assertTrue(
            repo.isGranted(address(repo), maintainer, MAINTAINER_PERMISSION_ID, bytes("")),
            "Specific conditional MAINTAINER grant must succeed when the condition returns true."
        );
        cond.setAnswer(false);
        assertFalse(
            repo.isGranted(address(repo), maintainer, MAINTAINER_PERMISSION_ID, bytes("")),
            "Specific conditional MAINTAINER grant must respect the condition."
        );
    }
}
