// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Vm} from "forge-std/Test.sol";

import {PSPBaseTest} from "./PSP.Base.sol";
import {PluginSetupProcessor} from "../../../../src/framework/plugin/setup/PluginSetupProcessor.sol";
import {
    PluginSetupRef,
    hashHelpers,
    hashPermissions,
    _getPreparedSetupId,
    _getAppliedSetupId,
    _getPluginInstallationId,
    PreparationType
} from "../../../../src/framework/plugin/setup/PluginSetupProcessorHelpers.sol";
import {PluginRepo} from "../../../../src/framework/plugin/repo/PluginRepo.sol";
import {IPluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/IPluginSetup.sol";
import {PermissionLib} from "@aragon/osx-commons-contracts/src/permission/PermissionLib.sol";

/// @notice Shared install helper for the Uninstallation suite — performs a
/// real V1 install on the DAO under test and returns the plugin address +
/// helpers the test needs to drive `prepareUninstallation`.
abstract contract PSPUninstallationFixture is PSPBaseTest {
    function _installV1() internal returns (address plugin, address[] memory helpers) {
        (address p, IPluginSetup.PreparedSetupData memory data) =
            psp.prepareInstallation(address(dao), _prepareInstallParams(1, ""));
        plugin = p;
        helpers = data.helpers;

        _grantApplyInstallation(owner);
        _grantPspRoot();
        psp.applyInstallation(
            address(dao),
            PluginSetupProcessor.ApplyInstallationParams({
                pluginSetupRef: _ref(1),
                plugin: p,
                permissions: data.permissions,
                helpersHash: hashHelpers(data.helpers)
            })
        );
        _revokePspRoot();

        // Advance the block so any subsequent prepare* writes a
        // preparedBlock strictly greater than pluginState.blockNumber —
        // required for `validatePreparedSetupId` to pass at apply-time.
        vm.roll(block.number + 1);
    }

    function _prepareUninstallParams(uint16 build, address plugin, address[] memory currentHelpers)
        internal
        view
        returns (PluginSetupProcessor.PrepareUninstallationParams memory)
    {
        return PluginSetupProcessor.PrepareUninstallationParams({
            pluginSetupRef: _ref(build),
            setupPayload: IPluginSetup.SetupPayload({plugin: plugin, currentHelpers: currentHelpers, data: ""})
        });
    }
}

/// @notice `prepareUninstallation` happy + adversarial paths.
contract PSPPrepareUninstallationTest is PSPUninstallationFixture {
    function test_prepareUninstallation_revertsIfPluginNotInstalled() public {
        // No install yet → currentAppliedSetupId == 0; computed appliedSetupId
        // is non-zero → mismatch reverts InvalidAppliedSetupId.
        address[] memory helpers = new address[](2);
        helpers[0] = address(0);
        helpers[1] = address(1);
        vm.expectRevert();
        psp.prepareUninstallation(address(dao), _prepareUninstallParams(1, makeAddr("fake"), helpers));
    }

    function test_prepareUninstallation_revertsIfHelpersTampered() public {
        (address plugin,) = _installV1();
        // Tamper helpers — computed appliedSetupId mismatches stored.
        address[] memory wrong = new address[](1);
        wrong[0] = makeAddr("tampered");
        vm.expectRevert();
        psp.prepareUninstallation(address(dao), _prepareUninstallParams(1, plugin, wrong));
    }

    function test_prepareUninstallation_revertsIfVersionTagWrong() public {
        (address plugin, address[] memory helpers) = _installV1();
        // Use V2's tag — appliedSetupId computed from V2 doesn't match stored V1.
        vm.expectRevert();
        psp.prepareUninstallation(address(dao), _prepareUninstallParams(2, plugin, helpers));
    }

    function test_prepareUninstallation_succeedsAndEmits() public {
        (address plugin, address[] memory helpers) = _installV1();

        vm.recordLogs();
        PermissionLib.MultiTargetPermission[] memory perms =
            psp.prepareUninstallation(address(dao), _prepareUninstallParams(1, plugin, helpers));
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 expected = keccak256(
            "UninstallationPrepared(address,address,bytes32,address,(uint8,uint16),(address,address[],bytes),(uint8,address,address,address,bytes32)[])"
        );
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(psp) && logs[i].topics[0] == expected) {
                assertEq(address(uint160(uint256(logs[i].topics[1]))), address(this));
                assertEq(address(uint160(uint256(logs[i].topics[2]))), address(dao));
                assertEq(address(uint160(uint256(logs[i].topics[3]))), address(uupsRepo));

                // preparedSetupId is the first non-indexed field; uninstall composition
                // locks in: ZERO_BYTES_HASH for helpersHash (not hashHelpers of current
                // helpers) and PreparationType.Uninstallation as the type-separator.
                bytes memory d = logs[i].data;
                bytes32 setupIdInEvent;
                assembly {
                    setupIdInEvent := mload(add(d, 32))
                }
                bytes32 expectedSetupId = _getPreparedSetupId(
                    _ref(1),
                    hashPermissions(perms),
                    keccak256(abi.encode(uint256(0))), // ZERO_BYTES_HASH
                    bytes(""),
                    PreparationType.Uninstallation
                );
                assertEq(setupIdInEvent, expectedSetupId, "preparedSetupId hash");
                found = true;
                break;
            }
        }
        assertTrue(found, "UninstallationPrepared not emitted");
    }

    function test_prepareUninstallation_revertsIfSameSetupAlreadyPrepared() public {
        (address plugin, address[] memory helpers) = _installV1();

        psp.prepareUninstallation(address(dao), _prepareUninstallParams(1, plugin, helpers));
        vm.expectRevert(); // SetupAlreadyPrepared
        psp.prepareUninstallation(address(dao), _prepareUninstallParams(1, plugin, helpers));
    }

    /// `prepareUninstallation` has no auth check — any caller succeeds.
    function test_prepareUninstallation_anyAddressCanCall() public {
        (address plugin, address[] memory helpers) = _installV1();

        address rando = makeAddr("rando");
        vm.prank(rando);
        psp.prepareUninstallation(address(dao), _prepareUninstallParams(1, plugin, helpers));
    }
}

/// @notice `applyUninstallation` permission gating + state reset + atomicity.
contract PSPApplyUninstallationTest is PSPUninstallationFixture {
    function _prepareUninstall()
        internal
        returns (address plugin, PluginSetupProcessor.ApplyUninstallationParams memory applyParams)
    {
        (address p, address[] memory helpers) = _installV1();
        PermissionLib.MultiTargetPermission[] memory perms =
            psp.prepareUninstallation(address(dao), _prepareUninstallParams(1, p, helpers));

        plugin = p;
        applyParams =
            PluginSetupProcessor.ApplyUninstallationParams({plugin: p, pluginSetupRef: _ref(1), permissions: perms});
    }

    function test_applyUninstallation_revertsIfCallerLacksPermission() public {
        (, PluginSetupProcessor.ApplyUninstallationParams memory p) = _prepareUninstall();
        address rando = makeAddr("rando");

        vm.expectRevert(
            abi.encodeWithSelector(
                PluginSetupProcessor.SetupApplicationUnauthorized.selector,
                address(dao),
                rando,
                APPLY_UNINSTALLATION_PERMISSION_ID
            )
        );
        vm.prank(rando);
        psp.applyUninstallation(address(dao), p);
    }

    function test_applyUninstallation_revertsIfNoPreparedSetup() public {
        (address plugin,) = _installV1();

        // Skip prepareUninstallation; jump straight to applyUninstallation
        // with a fabricated permissions array → preparedSetupId won't match.
        PermissionLib.MultiTargetPermission[] memory perms;
        PluginSetupProcessor.ApplyUninstallationParams memory p = PluginSetupProcessor.ApplyUninstallationParams({
            plugin: plugin, pluginSetupRef: _ref(1), permissions: perms
        });

        _grantApplyUninstallation(owner);
        vm.expectRevert(); // SetupNotApplicable
        psp.applyUninstallation(address(dao), p);
    }

    function test_applyUninstallation_succeedsAndResetsState() public {
        (address plugin, PluginSetupProcessor.ApplyUninstallationParams memory p) = _prepareUninstall();
        _grantApplyUninstallation(owner);
        _grantPspRoot();

        psp.applyUninstallation(address(dao), p);

        bytes32 installationId = _getPluginInstallationId(address(dao), plugin);
        (uint256 blockNum, bytes32 currentAppliedId) = psp.states(installationId);
        assertEq(blockNum, block.number, "block updated");
        assertEq(currentAppliedId, bytes32(0), "currentAppliedSetupId reset");
    }

    function test_applyUninstallation_emitsUninstallationApplied() public {
        (address plugin, PluginSetupProcessor.ApplyUninstallationParams memory p) = _prepareUninstall();
        _grantApplyUninstallation(owner);
        _grantPspRoot();

        vm.recordLogs();
        psp.applyUninstallation(address(dao), p);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 expected = keccak256("UninstallationApplied(address,address,bytes32)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(psp) && logs[i].topics[0] == expected) {
                assertEq(address(uint160(uint256(logs[i].topics[1]))), address(dao));
                assertEq(address(uint160(uint256(logs[i].topics[2]))), plugin);

                // Data field carries the preparedSetupId that was just applied.
                bytes32 prep = abi.decode(logs[i].data, (bytes32));
                bytes32 expectedPrep = _getPreparedSetupId(
                    _ref(1),
                    hashPermissions(p.permissions),
                    keccak256(abi.encode(uint256(0))), // ZERO_BYTES_HASH
                    bytes(""),
                    PreparationType.Uninstallation
                );
                assertEq(prep, expectedPrep, "preparedSetupId");
                found = true;
                break;
            }
        }
        assertTrue(found);
    }

    /// EDGE: after applying one uninstall, any OTHER pending uninstall prep
    /// for the same plugin becomes inapplicable (pluginState.blockNumber bumps
    /// past their preparedBlock).
    function test_applyUninstallation_otherPendingPrepsBecomeInapplicable() public {
        (address plugin, address[] memory helpers) = _installV1();

        // Prep 1: mock permissions range A → setup id A.
        setupV1.mockPermissionIndexes(1, 2);
        PermissionLib.MultiTargetPermission[] memory permsA =
            psp.prepareUninstallation(address(dao), _prepareUninstallParams(1, plugin, helpers));

        // Prep 2: mock permissions range B → setup id B.
        setupV1.mockPermissionIndexes(3, 4);
        PermissionLib.MultiTargetPermission[] memory permsB =
            psp.prepareUninstallation(address(dao), _prepareUninstallParams(1, plugin, helpers));

        // Apply A.
        _grantApplyUninstallation(owner);
        _grantPspRoot();
        psp.applyUninstallation(
            address(dao),
            PluginSetupProcessor.ApplyUninstallationParams({
                plugin: plugin, pluginSetupRef: _ref(1), permissions: permsA
            })
        );

        // B is now inapplicable.
        vm.expectRevert(); // SetupNotApplicable
        psp.applyUninstallation(
            address(dao),
            PluginSetupProcessor.ApplyUninstallationParams({
                plugin: plugin, pluginSetupRef: _ref(1), permissions: permsB
            })
        );

        setupV1.reset();
    }

    /// After uninstall, the same plugin slot is fresh — re-install is possible.
    /// Lock in the lifecycle: install → uninstall → install.
    function test_applyUninstallation_allowsReInstallationAfterward() public {
        (address plugin, PluginSetupProcessor.ApplyUninstallationParams memory p) = _prepareUninstall();
        _grantApplyUninstallation(owner);
        _grantPspRoot();
        psp.applyUninstallation(address(dao), p);

        // Re-install — note that V1 setup deploys a NEW proxy, so a different
        // plugin address. The previous slot stays at zero (uninstalled).
        (address newPlugin, IPluginSetup.PreparedSetupData memory data) =
            psp.prepareInstallation(address(dao), _prepareInstallParams(1, ""));
        assertTrue(newPlugin != plugin, "fresh plugin address");

        _grantApplyInstallation(owner);
        psp.applyInstallation(
            address(dao),
            PluginSetupProcessor.ApplyInstallationParams({
                pluginSetupRef: _ref(1),
                plugin: newPlugin,
                permissions: data.permissions,
                helpersHash: hashHelpers(data.helpers)
            })
        );

        bytes32 newId = _getPluginInstallationId(address(dao), newPlugin);
        (, bytes32 currentId) = psp.states(newId);
        assertTrue(currentId != bytes32(0));
    }

    /// Atomicity: if PSP lacks ROOT on the DAO when uninstall permissions are
    /// applied, `applyMultiTargetPermissions` reverts and the uninstall-specific
    /// state mutations (zeroing `currentAppliedSetupId`, bumping `blockNumber`)
    /// must NOT have landed.
    function test_applyUninstallation_revertsIfPspLacksDaoRootAndRollsBack() public {
        (address plugin, PluginSetupProcessor.ApplyUninstallationParams memory p) = _prepareUninstall();
        _grantApplyUninstallation(owner);
        // Deliberately do NOT grant PSP ROOT — `applyMultiTargetPermissions` will revert.

        // Snapshot state before the doomed apply.
        bytes32 installationId = _getPluginInstallationId(address(dao), plugin);
        (uint256 blockBefore, bytes32 appliedBefore) = psp.states(installationId);
        assertTrue(appliedBefore != bytes32(0), "fixture: install was applied");

        vm.expectRevert();
        psp.applyUninstallation(address(dao), p);

        // State unchanged — neither the block bump nor the zero-out landed.
        (uint256 blockAfter, bytes32 appliedAfter) = psp.states(installationId);
        assertEq(blockAfter, blockBefore, "blockNumber must not advance on revert");
        assertEq(appliedAfter, appliedBefore, "currentAppliedSetupId must not zero out on revert");
    }

    /// If the prepared uninstall returns an empty permissions array, the
    /// `if (_params.permissions.length > 0)` branch is skipped — PSP does not
    /// need ROOT on the DAO and `applyMultiTargetPermissions` is never called.
    function test_applyUninstallation_skipsApplyMultiTargetPermissionsIfEmpty() public {
        (address plugin, address[] memory helpers) = _installV1();

        // Mock the V1 setup to return ZERO permissions on prepareUninstallation.
        setupV1.mockPermissionIndexes(1, 1);
        PermissionLib.MultiTargetPermission[] memory perms =
            psp.prepareUninstallation(address(dao), _prepareUninstallParams(1, plugin, helpers));
        assertEq(perms.length, 0, "fixture: empty permissions array");

        // No PSP ROOT grant — the empty-branch path must short-circuit before
        // any DAO permission call would have needed ROOT.
        _grantApplyUninstallation(owner);
        psp.applyUninstallation(
            address(dao),
            PluginSetupProcessor.ApplyUninstallationParams({
                plugin: plugin, pluginSetupRef: _ref(1), permissions: perms
            })
        );

        bytes32 installationId = _getPluginInstallationId(address(dao), plugin);
        (uint256 blockNum, bytes32 currentAppliedId) = psp.states(installationId);
        assertEq(blockNum, block.number, "uninstall latched without permissions");
        assertEq(currentAppliedId, bytes32(0), "currentAppliedSetupId reset");

        setupV1.reset();
    }
}
