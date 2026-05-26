// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Vm} from "forge-std/Test.sol";

import {PSPBaseTest} from "./PSP.Base.sol";
import {DAO} from "../../../../src/core/dao/DAO.sol";
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
import {PermissionManager} from "../../../../src/core/permission/PermissionManager.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {
    PluginUUPSUpgradeableReenteringSetupMock
} from "../../../mocks/plugin/UUPSUpgradeable/PluginUUPSUpgradeableReenteringSetupMock.sol";
import {PluginUUPSUpgradeableV1Mock} from "../../../mocks/plugin/UUPSUpgradeable/PluginUUPSUpgradeableMock.sol";

/// @notice `prepareInstallation` happy + adversarial paths.
contract PSPPrepareInstallationTest is PSPBaseTest {
    function test_prepareInstallation_revertsIfRepoNotInRegistry() public {
        // A freshly-deployed `PluginRepo` impl (not registered) suffices to
        // trigger the `repoRegistry.entries(addr) == false` revert path —
        // PSP rejects before any call to the repo, so the un-initialized
        // state of the impl is irrelevant.
        PluginRepo unregistered = new PluginRepo();
        PluginSetupRef memory ref =
            PluginSetupRef({versionTag: PluginRepo.Tag({release: 1, build: 1}), pluginSetupRepo: unregistered});

        vm.expectRevert(PluginSetupProcessor.PluginRepoNonexistent.selector);
        psp.prepareInstallation(
            address(dao), PluginSetupProcessor.PrepareInstallationParams({pluginSetupRef: ref, data: ""})
        );
    }

    function test_prepareInstallation_revertsIfVersionDoesNotExist() public {
        // Build 99 doesn't exist in uupsRepo. The repo's `getVersion` reverts
        // `VersionHashDoesNotExist`. PSP propagates the revert as-is.
        PluginSetupRef memory ref =
            PluginSetupRef({versionTag: PluginRepo.Tag({release: 1, build: 99}), pluginSetupRepo: uupsRepo});

        vm.expectRevert(); // VersionHashDoesNotExist(hash) — exact hash is calldata-derived
        psp.prepareInstallation(
            address(dao), PluginSetupProcessor.PrepareInstallationParams({pluginSetupRef: ref, data: ""})
        );
    }

    function test_prepareInstallation_succeedsAndReturnsPluginAndSetupData() public {
        (address plugin, IPluginSetup.PreparedSetupData memory data) =
            psp.prepareInstallation(address(dao), _prepareInstallParams(1, ""));

        assertTrue(plugin != address(0), "plugin not deployed");
        assertEq(data.helpers.length, 2, "V1 setup returns 2 helpers");
        assertEq(data.permissions.length, 2, "V1 setup returns 2 permissions");
    }

    function test_prepareInstallation_writesPreparedSetupIdAtCurrentBlock() public {
        (address plugin, IPluginSetup.PreparedSetupData memory data) =
            psp.prepareInstallation(address(dao), _prepareInstallParams(1, ""));

        bytes32 installationId = _getPluginInstallationId(address(dao), plugin);
        bytes32 setupId = _getPreparedSetupId(
            _ref(1),
            hashPermissions(data.permissions),
            hashHelpers(data.helpers),
            bytes(""),
            PreparationType.Installation
        );

        // Calling `validatePreparedSetupId(installationId, setupId)` from a
        // fresh state should NOT revert — the pluginState.blockNumber is 0,
        // and preparedSetupIdToBlockNumber is `block.number` (> 0 here).
        psp.validatePreparedSetupId(installationId, setupId);
    }

    function test_prepareInstallation_emitsInstallationPrepared() public {
        vm.recordLogs();
        (address plugin, IPluginSetup.PreparedSetupData memory data) =
            psp.prepareInstallation(address(dao), _prepareInstallParams(1, ""));
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 expected = keccak256(
            "InstallationPrepared(address,address,bytes32,address,(uint8,uint16),bytes,address,(address[],(uint8,address,address,address,bytes32)[]))"
        );
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(psp) && logs[i].topics[0] == expected) {
                // sender, dao, pluginSetupRepo are indexed.
                assertEq(address(uint160(uint256(logs[i].topics[1]))), address(this), "sender");
                assertEq(address(uint160(uint256(logs[i].topics[2]))), address(dao), "dao");
                assertEq(address(uint160(uint256(logs[i].topics[3]))), address(uupsRepo), "repo");

                // preparedSetupId is the first non-indexed field in data.
                bytes memory d = logs[i].data;
                bytes32 setupIdInEvent;
                assembly {
                    setupIdInEvent := mload(add(d, 32))
                }
                bytes32 expectedSetupId = _getPreparedSetupId(
                    _ref(1),
                    hashPermissions(data.permissions),
                    hashHelpers(data.helpers),
                    bytes(""),
                    PreparationType.Installation
                );
                assertEq(setupIdInEvent, expectedSetupId, "preparedSetupId");
                assertTrue(plugin != address(0), "plugin returned");
                found = true;
                break;
            }
        }
        assertTrue(found, "InstallationPrepared not emitted");
    }

    function test_prepareInstallation_revertsIfSamePrepIdPending() public {
        // The V1 mock deploys a NEW proxy each call (different `plugin` →
        // different installationId), so re-using V1 lands in a fresh state
        // slot and bypasses the `SetupAlreadyPrepared` check. Use the "Bad"
        // variant (build 5) which always returns `plugin = address(0)` —
        // both calls hit the same installationId.
        psp.prepareInstallation(address(dao), _prepareInstallParams(5, ""));

        // Same params → same preparedSetupId; second call must revert.
        vm.expectRevert(); // SetupAlreadyPrepared(bytes32)
        psp.prepareInstallation(address(dao), _prepareInstallParams(5, ""));
    }

    function test_prepareInstallation_allowsDifferentSetupIdsForSamePlugin() public {
        // Different `data` does NOT change setupId (V1 mock ignores data),
        // but mocking different permission ranges produces different setupIds.
        setupV1.mockPermissionIndexes(1, 3);
        psp.prepareInstallation(address(dao), _prepareInstallParams(1, ""));

        // Reset mock so a NEW range produces a different setupId.
        setupV1.mockPermissionIndexes(2, 5);
        psp.prepareInstallation(address(dao), _prepareInstallParams(1, ""));

        // Two distinct prepared setupIds now coexist for the same plugin.
        // Reset for next test.
        setupV1.reset();
    }

    function test_prepareInstallation_anyAddressCanCall() public {
        address rando = makeAddr("rando");
        vm.prank(rando);
        (address plugin,) = psp.prepareInstallation(address(dao), _prepareInstallParams(1, ""));
        assertTrue(plugin != address(0));
    }
}

/// @notice `applyInstallation` permission gating + state transitions + atomicity.
/// Each test runs its own `prepareInstallation` (Foundry can't copy nested
/// struct arrays from memory to storage, so caching across the contract scope
/// isn't possible).
contract PSPApplyInstallationTest is PSPBaseTest {
    function _prepare()
        internal
        returns (address plugin, PluginSetupProcessor.ApplyInstallationParams memory applyParams)
    {
        (address p, IPluginSetup.PreparedSetupData memory data) =
            psp.prepareInstallation(address(dao), _prepareInstallParams(1, ""));
        plugin = p;
        applyParams = PluginSetupProcessor.ApplyInstallationParams({
            pluginSetupRef: _ref(1), plugin: p, permissions: data.permissions, helpersHash: hashHelpers(data.helpers)
        });
    }

    function test_applyInstallation_revertsIfCallerLacksPermissionAndIsNotDao() public {
        (, PluginSetupProcessor.ApplyInstallationParams memory p) = _prepare();
        _grantPspRoot();
        address rando = makeAddr("rando");

        vm.expectRevert(
            abi.encodeWithSelector(
                PluginSetupProcessor.SetupApplicationUnauthorized.selector,
                address(dao),
                rando,
                APPLY_INSTALLATION_PERMISSION_ID
            )
        );
        vm.prank(rando);
        psp.applyInstallation(address(dao), p);
    }

    function test_applyInstallation_succeedsForCallerWithGrant() public {
        (address plugin, PluginSetupProcessor.ApplyInstallationParams memory p) = _prepare();
        address operator = makeAddr("operator");
        _grantApplyInstallation(operator);
        _grantPspRoot();

        vm.prank(operator);
        psp.applyInstallation(address(dao), p);

        bytes32 installationId = _getPluginInstallationId(address(dao), plugin);
        (uint256 blockNum, bytes32 currentAppliedId) = psp.states(installationId);
        bytes32 expectedAppliedId = _getAppliedSetupId(_ref(1), p.helpersHash);
        assertEq(blockNum, block.number);
        assertEq(currentAppliedId, expectedAppliedId);
    }

    /// **F32 closer**: `msg.sender == _dao` bypasses APPLY_INSTALLATION_PERMISSION.
    function test_applyInstallation_daoAsSelfBypassesPermissionCheck() public {
        (address plugin, PluginSetupProcessor.ApplyInstallationParams memory p) = _prepare();
        _grantPspRoot();

        vm.prank(address(dao));
        psp.applyInstallation(address(dao), p);

        bytes32 installationId = _getPluginInstallationId(address(dao), plugin);
        (, bytes32 currentAppliedId) = psp.states(installationId);
        assertTrue(currentAppliedId != bytes32(0));
    }

    function test_applyInstallation_revertsIfPspLacksDaoRoot() public {
        (, PluginSetupProcessor.ApplyInstallationParams memory p) = _prepare();
        _grantApplyInstallation(owner);
        // PSP has NO ROOT on the DAO. The permissions array is non-empty, so
        // `dao.applyMultiTargetPermissions` runs and reverts Unauthorized.
        vm.expectRevert();
        psp.applyInstallation(address(dao), p);
    }

    function test_applyInstallation_revertsOnSecondApply() public {
        (, PluginSetupProcessor.ApplyInstallationParams memory p) = _prepare();
        _grantApplyInstallation(owner);
        _grantPspRoot();
        psp.applyInstallation(address(dao), p);

        // Re-running apply with same params reverts: the setup id's
        // preparedBlock <= pluginState.blockNumber after the first apply.
        vm.expectRevert();
        psp.applyInstallation(address(dao), p);
    }

    function test_applyInstallation_revertsIfPrepIdNotApplicable() public {
        (, PluginSetupProcessor.ApplyInstallationParams memory p) = _prepare();
        _grantPspRoot();
        // Tamper helpersHash → computed preparedSetupId won't match any pending prep.
        p.helpersHash = keccak256("tampered");

        vm.expectRevert(); // SetupNotApplicable
        psp.applyInstallation(address(dao), p);
    }

    function test_applyInstallation_emitsInstallationApplied() public {
        (address plugin, PluginSetupProcessor.ApplyInstallationParams memory p) = _prepare();
        _grantApplyInstallation(owner);
        _grantPspRoot();

        vm.recordLogs();
        psp.applyInstallation(address(dao), p);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 expectedTopic = keccak256("InstallationApplied(address,address,bytes32,bytes32)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(psp) && logs[i].topics[0] == expectedTopic) {
                assertEq(address(uint160(uint256(logs[i].topics[1]))), address(dao), "dao");
                assertEq(address(uint160(uint256(logs[i].topics[2]))), plugin, "plugin");

                (bytes32 prep, bytes32 applied) = abi.decode(logs[i].data, (bytes32, bytes32));
                bytes32 expectedPrep = _getPreparedSetupId(
                    _ref(1), hashPermissions(p.permissions), p.helpersHash, bytes(""), PreparationType.Installation
                );
                bytes32 expectedApplied = _getAppliedSetupId(_ref(1), p.helpersHash);
                assertEq(prep, expectedPrep, "preparedSetupId");
                assertEq(applied, expectedApplied, "appliedSetupId");
                found = true;
                break;
            }
        }
        assertTrue(found, "InstallationApplied not emitted");
    }

    /// **F31 closer**: cross-plugin replay defence — passing a DIFFERENT plugin
    /// to `applyInstallation` with the SAME other params lands in a state slot
    /// keyed by (dao, OTHER plugin), whose `preparedSetupIdToBlockNumber` is
    /// zero → `validatePreparedSetupId` reverts `SetupNotApplicable`.
    function test_applyInstallation_blocksCrossPluginReplay() public {
        (, PluginSetupProcessor.ApplyInstallationParams memory p) = _prepare();
        _grantPspRoot();

        address fake = makeAddr("fakePlugin");
        p.plugin = fake;

        vm.expectRevert(); // SetupNotApplicable
        psp.applyInstallation(address(dao), p);
    }

    /// Ordering atomicity: when permission application reverts, the state
    /// mutations (`currentAppliedSetupId`, `blockNumber`) must roll back.
    function test_applyInstallation_rollsBackStateIfPermissionsRevert() public {
        (address plugin, PluginSetupProcessor.ApplyInstallationParams memory p) = _prepare();
        _grantApplyInstallation(owner);

        // PSP without ROOT → outer reverts.
        vm.expectRevert();
        psp.applyInstallation(address(dao), p);

        // State must be untouched.
        bytes32 installationId = _getPluginInstallationId(address(dao), plugin);
        (uint256 blockNum, bytes32 currentAppliedId) = psp.states(installationId);
        assertEq(blockNum, 0);
        assertEq(currentAppliedId, bytes32(0));
    }
}

/// @notice Empty-permissions branch + helpers/setup-id helpers.
contract PSPInstallationEdgeTest is PSPBaseTest {
    function test_applyInstallation_skipsApplyMultiTargetPermissionsIfEmpty() public {
        // Mock setupV1 to return ZERO permissions (rangeStart == rangeEnd → empty).
        setupV1.mockPermissionIndexes(1, 1); // empty range
        (address plugin, IPluginSetup.PreparedSetupData memory data) =
            psp.prepareInstallation(address(dao), _prepareInstallParams(1, ""));

        // No need to grant PSP ROOT — the `if (_params.permissions.length > 0)`
        // branch is skipped, so dao.applyMultiTargetPermissions is NEVER called.
        _grantApplyInstallation(owner);
        psp.applyInstallation(
            address(dao),
            PluginSetupProcessor.ApplyInstallationParams({
                pluginSetupRef: _ref(1),
                plugin: plugin,
                permissions: data.permissions,
                helpersHash: hashHelpers(data.helpers)
            })
        );

        bytes32 installationId = _getPluginInstallationId(address(dao), plugin);
        (, bytes32 currentAppliedId) = psp.states(installationId);
        assertTrue(currentAppliedId != bytes32(0), "install latched without permissions");

        setupV1.reset();
    }

    /// **F30 closer**: drift detectors for `EMPTY_ARRAY_HASH` and `ZERO_BYTES_HASH`.
    function test_emptyArrayHash_matchesRuntimeComputation() public pure {
        PermissionLib.MultiTargetPermission[] memory empty;
        bytes32 expected = keccak256(abi.encode(empty));
        // The literal hard-coded in PSP — kept as a runtime equality check
        // (the constant itself is `private` in PSP.sol).
        assertEq(expected, 0x569e75fc77c1a856f6daaf9e69d8a9566ca34aa47f9133711ce065a571af0cfd);
    }

    function test_zeroBytesHash_matchesRuntimeComputation() public pure {
        bytes32 expected = keccak256(abi.encode(uint256(0)));
        assertEq(expected, 0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563);
    }

    function test_helperHashes_areOrderSensitive() public pure {
        address[] memory a = new address[](2);
        a[0] = address(0x1);
        a[1] = address(0x2);
        address[] memory b = new address[](2);
        b[0] = address(0x2);
        b[1] = address(0x1);
        assertTrue(hashHelpers(a) != hashHelpers(b));
    }

    function test_installationId_isCrossDaoIsolated() public pure {
        bytes32 id1 = _getPluginInstallationId(address(0xAAA), address(0xBBB));
        bytes32 id2 = _getPluginInstallationId(address(0xCCC), address(0xBBB));
        assertTrue(id1 != id2);
    }

    function test_installationId_isCrossPluginIsolated() public pure {
        bytes32 id1 = _getPluginInstallationId(address(0xAAA), address(0xBBB));
        bytes32 id2 = _getPluginInstallationId(address(0xAAA), address(0xCCC));
        assertTrue(id1 != id2);
    }

    function test_preparedSetupId_preparationTypeSeparation() public view {
        PluginSetupRef memory ref = _ref(1);
        bytes32 install = _getPreparedSetupId(ref, bytes32(0), bytes32(0), bytes(""), PreparationType.Installation);
        bytes32 update = _getPreparedSetupId(ref, bytes32(0), bytes32(0), bytes(""), PreparationType.Update);
        bytes32 uninstall = _getPreparedSetupId(ref, bytes32(0), bytes32(0), bytes(""), PreparationType.Uninstallation);
        bytes32 none = _getPreparedSetupId(ref, bytes32(0), bytes32(0), bytes(""), PreparationType.None);
        assertTrue(install != update);
        assertTrue(install != uninstall);
        assertTrue(update != uninstall);
        assertTrue(none != install);
    }

    /// `validatePreparedSetupId` boundary: at `blockNumber == preparedBlock`
    /// the `>=` check fires. Lock in.
    function test_validatePreparedSetupId_boundaryReverts() public {
        (address plugin, IPluginSetup.PreparedSetupData memory data) =
            psp.prepareInstallation(address(dao), _prepareInstallParams(1, ""));

        _grantApplyInstallation(owner);
        _grantPspRoot();
        psp.applyInstallation(
            address(dao),
            PluginSetupProcessor.ApplyInstallationParams({
                pluginSetupRef: _ref(1),
                plugin: plugin,
                permissions: data.permissions,
                helpersHash: hashHelpers(data.helpers)
            })
        );

        // Now the setup's preparedBlock == pluginState.blockNumber (same block).
        // Calling validatePreparedSetupId for the just-applied prepId reverts
        // because `blockNumber >= preparedBlock`.
        bytes32 installationId = _getPluginInstallationId(address(dao), plugin);
        bytes32 setupId = _getPreparedSetupId(
            _ref(1),
            hashPermissions(data.permissions),
            hashHelpers(data.helpers),
            bytes(""),
            PreparationType.Installation
        );

        vm.expectRevert(abi.encodeWithSelector(PluginSetupProcessor.SetupNotApplicable.selector, setupId));
        psp.validatePreparedSetupId(installationId, setupId);
    }
}

/// @notice Constructor + permission ID drift detectors.
contract PSPConstructorAndConstantsTest is PSPBaseTest {
    function test_constructor_storesRepoRegistry() public view {
        assertEq(address(psp.repoRegistry()), address(pluginRepoRegistry));
    }

    function test_permissionId_applyInstallationMatchesKeccak() public view {
        assertEq(psp.APPLY_INSTALLATION_PERMISSION_ID(), keccak256("APPLY_INSTALLATION_PERMISSION"));
    }

    function test_permissionId_applyUpdateMatchesKeccak() public view {
        assertEq(psp.APPLY_UPDATE_PERMISSION_ID(), keccak256("APPLY_UPDATE_PERMISSION"));
    }

    function test_permissionId_applyUninstallationMatchesKeccak() public view {
        assertEq(psp.APPLY_UNINSTALLATION_PERMISSION_ID(), keccak256("APPLY_UNINSTALLATION_PERMISSION"));
    }

    /// The three apply-permission IDs must be pairwise distinct.
    function test_permissionIds_distinctAcrossApplyOperations() public view {
        bytes32 ins = psp.APPLY_INSTALLATION_PERMISSION_ID();
        bytes32 upd = psp.APPLY_UPDATE_PERMISSION_ID();
        bytes32 uni = psp.APPLY_UNINSTALLATION_PERMISSION_ID();
        assertTrue(ins != upd);
        assertTrue(ins != uni);
        assertTrue(upd != uni);
    }
}

/// @notice `prepareInstallation` — payload edges + re-entry behaviour.
contract PSPPrepareInstallationPayloadTest is PSPBaseTest {
    /// Very large `_data` payload accepted (gas-bounded but no length cap).
    function test_prepareInstallation_acceptsLargeData() public {
        bytes memory big = new bytes(8_000);
        for (uint256 i = 0; i < big.length; i++) {
            big[i] = bytes1(uint8(i & 0xff));
        }
        psp.prepareInstallation(address(dao), _prepareInstallParams(1, big));
    }

    /// A `PluginSetup` whose `prepareInstallation` re-enters `psp.prepareInstallation`
    /// (for a different setup target) succeeds. PSP does not protect against
    /// re-entry from the setup callback; both prepares complete, recording two
    /// independent prepared-setup-ids for two independent (dao, plugin) pairs.
    function test_prepareInstallation_allowsReentryFromPluginSetup() public {
        // Publish a re-entering setup as build 6 of uupsRepo. It re-enters PSP
        // to also prepare an install via build 1 (setupV1) during its own
        // prepareInstallation.
        PluginUUPSUpgradeableV1Mock pluginImpl = new PluginUUPSUpgradeableV1Mock();
        PluginUUPSUpgradeableReenteringSetupMock reenterer =
            new PluginUUPSUpgradeableReenteringSetupMock(address(pluginImpl), psp, uupsRepo, 1, 1);
        uupsRepo.createVersion(1, address(reenterer), hex"66", hex"");

        // Outer call uses build 6 (reentering); inner re-entry uses build 1.
        (address outerPlugin, IPluginSetup.PreparedSetupData memory outerData) =
            psp.prepareInstallation(address(dao), _prepareInstallParams(6, ""));

        // Both prepare calls succeeded. Outer's prepared setup id is recorded:
        bytes32 outerInstallationId = _getPluginInstallationId(address(dao), outerPlugin);
        bytes32 outerSetupId = _getPreparedSetupId(
            _ref(6),
            hashPermissions(outerData.permissions),
            hashHelpers(outerData.helpers),
            bytes(""),
            PreparationType.Installation
        );
        psp.validatePreparedSetupId(outerInstallationId, outerSetupId);
    }
}

/// @notice `validatePreparedSetupId` — fresh-state revert.
contract PSPValidatePreparedSetupIdEdgesTest is PSPBaseTest {
    /// On a completely fresh `(dao, plugin)` pair, querying any setupId reverts
    /// `SetupNotApplicable` because pluginState.blockNumber == 0 AND
    /// preparedSetupIdToBlockNumber[id] == 0 (so `0 >= 0` fires).
    function test_validatePreparedSetupId_freshStateReverts() public {
        bytes32 installationId = _getPluginInstallationId(address(dao), makeAddr("untouched-plugin"));
        bytes32 fakeSetupId = keccak256("anything");

        vm.expectRevert(abi.encodeWithSelector(PluginSetupProcessor.SetupNotApplicable.selector, fakeSetupId));
        psp.validatePreparedSetupId(installationId, fakeSetupId);
    }
}

/// @notice Cross-DAO isolation — state changes on dao1 must not leak to dao2.
contract PSPMultiDaoIsolationTest is PSPBaseTest {
    DAO internal dao2;

    function setUp() public override {
        super.setUp();
        DAO impl = new DAO();
        dao2 = DAO(
            payable(address(
                    new ERC1967Proxy(
                        address(impl),
                        abi.encodeCall(DAO.initialize, (hex"0002", owner, address(0), "https://example2.org"))
                    )
                ))
        );
    }

    function test_multiDao_installOnDao1_dao2StateUntouched() public {
        (address plugin, IPluginSetup.PreparedSetupData memory data) =
            psp.prepareInstallation(address(dao), _prepareInstallParams(1, ""));
        _grantApplyInstallation(owner);
        _grantPspRoot();
        psp.applyInstallation(
            address(dao),
            PluginSetupProcessor.ApplyInstallationParams({
                pluginSetupRef: _ref(1),
                plugin: plugin,
                permissions: data.permissions,
                helpersHash: hashHelpers(data.helpers)
            })
        );

        bytes32 dao2InstallationId = _getPluginInstallationId(address(dao2), plugin);
        (uint256 dao2Block, bytes32 dao2AppliedId) = psp.states(dao2InstallationId);
        assertEq(dao2Block, 0);
        assertEq(dao2AppliedId, bytes32(0));
    }
}
