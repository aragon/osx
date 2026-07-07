// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {PermissionManagerTest} from "../mocks/permission/PermissionManagerTest.sol";
import {
    _getPluginInstallationId,
    _getPreparedSetupId,
    _getAppliedSetupId,
    PluginSetupRef,
    PreparationType
} from "../../src/framework/plugin/setup/PluginSetupProcessorHelpers.sol";
import {PluginRepo} from "../../src/framework/plugin/repo/PluginRepo.sol";

/// @notice Property-based tests for two cryptographic-determinism surfaces
/// the whole protocol relies on:
///
/// 1. `PermissionManager.permissionHash(where, who, id)` — keys the
///    `permissionsHashed` mapping. Any collision or order-insensitivity
///    would let permissions leak across slots.
/// 2. PSP id helpers (`_getPluginInstallationId`, `_getPreparedSetupId`,
///    `_getAppliedSetupId`) — key the install / update / uninstall
///    state machine. Collisions across (dao, plugin) pairs or preparation
///    types would conflate independent installations.
///
/// These are pure functions; fuzz them with random inputs to assert
/// invariants that case-based tests can only sample.
contract HashingPropertiesFuzzTest is Test {
    PermissionManagerTest internal pm;

    function setUp() public {
        pm = new PermissionManagerTest();
        pm.init(address(this));
    }

    // -------------------------------------------------------------------------
    // FZ-3 — permissionHash properties
    // -------------------------------------------------------------------------

    /// Hashing is deterministic: same inputs → same output across calls.
    function testFuzz_permissionHash_deterministic(
        address where,
        address who,
        bytes32 permissionId
    ) public view {
        bytes32 a = pm.getPermissionHash(where, who, permissionId);
        bytes32 b = pm.getPermissionHash(where, who, permissionId);
        assertEq(a, b);
    }

    /// Distinct (where, who) pairs produce distinct hashes — order matters
    /// (swapping where and who must yield a different slot). Excludes the
    /// degenerate `where == who` case.
    function testFuzz_permissionHash_orderSensitive(
        address a,
        address b,
        bytes32 permissionId
    ) public view {
        vm.assume(a != b);
        bytes32 h1 = pm.getPermissionHash(a, b, permissionId);
        bytes32 h2 = pm.getPermissionHash(b, a, permissionId);
        assertTrue(h1 != h2, "where/who swap must change the hash");
    }

    /// Distinct permission ids on the same (where, who) produce distinct
    /// hashes — no cross-id slot aliasing.
    function testFuzz_permissionHash_distinctIdsDistinctHashes(
        address where,
        address who,
        bytes32 id1,
        bytes32 id2
    ) public view {
        vm.assume(id1 != id2);
        bytes32 h1 = pm.getPermissionHash(where, who, id1);
        bytes32 h2 = pm.getPermissionHash(where, who, id2);
        assertTrue(h1 != h2, "distinct permission ids must yield distinct hashes");
    }

    // -------------------------------------------------------------------------
    // FZ-4 — PSP id helpers
    // -------------------------------------------------------------------------

    /// `_getPluginInstallationId(dao, plugin)` is order-aware (dao first,
    /// then plugin). Swapping them must change the id — locks in that the
    /// pair is treated as ordered, not as a set.
    function testFuzz_installationId_orderSensitive(address dao, address plugin) public pure {
        vm.assume(dao != plugin);
        bytes32 a = _getPluginInstallationId(dao, plugin);
        bytes32 b = _getPluginInstallationId(plugin, dao);
        assertTrue(a != b, "dao/plugin swap must change installationId");
    }

    /// Two distinct (dao, plugin) pairs must hash to distinct installationIds.
    /// Property: if either dao OR plugin differs, the ids differ.
    function testFuzz_installationId_distinctPairsDistinctIds(
        address dao1,
        address plugin1,
        address dao2,
        address plugin2
    ) public pure {
        vm.assume(dao1 != dao2 || plugin1 != plugin2);
        bytes32 a = _getPluginInstallationId(dao1, plugin1);
        bytes32 b = _getPluginInstallationId(dao2, plugin2);
        assertTrue(a != b, "distinct (dao, plugin) pairs must yield distinct ids");
    }

    /// `_getPreparedSetupId(...)` is type-separator-sensitive: identical
    /// (ref, permsHash, helpersHash, data) inputs but different
    /// `PreparationType` must produce DISTINCT ids. Otherwise install /
    /// update / uninstall states could collide and one could be replayed
    /// against another.
    function testFuzz_preparedSetupId_typeSeparation(
        uint8 release,
        uint16 build,
        address repo,
        bytes32 permsHash,
        bytes32 helpersHash,
        bytes calldata data
    ) public pure {
        vm.assume(release != 0);
        PluginSetupRef memory ref = PluginSetupRef({
            versionTag: PluginRepo.Tag({release: release, build: build}),
            pluginSetupRepo: PluginRepo(repo)
        });

        bytes32 install = _getPreparedSetupId(ref, permsHash, helpersHash, data, PreparationType.Installation);
        bytes32 update = _getPreparedSetupId(ref, permsHash, helpersHash, data, PreparationType.Update);
        bytes32 uninstall =
            _getPreparedSetupId(ref, permsHash, helpersHash, data, PreparationType.Uninstallation);
        bytes32 none = _getPreparedSetupId(ref, permsHash, helpersHash, data, PreparationType.None);

        assertTrue(install != update, "install != update");
        assertTrue(install != uninstall, "install != uninstall");
        assertTrue(install != none, "install != none");
        assertTrue(update != uninstall, "update != uninstall");
        assertTrue(update != none, "update != none");
        assertTrue(uninstall != none, "uninstall != none");
    }

    /// `_getAppliedSetupId(ref, helpersHash)` and
    /// `_getPreparedSetupId(ref, permsHash, helpersHash, data, type)` are
    /// computed over different argument tuples — different abi.encode
    /// lengths, distinct keccak preimages. The two id spaces must NOT
    /// overlap; otherwise a prepared id could be replayed as an applied
    /// id (or vice versa), conflating two phases of the PSP state machine.
    function testFuzz_appliedAndPreparedIdSpacesDoNotOverlap(
        uint8 release,
        uint16 build,
        address repo,
        bytes32 helpersHash,
        bytes32 permsHash,
        bytes calldata data
    ) public pure {
        vm.assume(release != 0);
        PluginSetupRef memory ref = PluginSetupRef({
            versionTag: PluginRepo.Tag({release: release, build: build}),
            pluginSetupRepo: PluginRepo(repo)
        });

        bytes32 applied = _getAppliedSetupId(ref, helpersHash);
        // Same `(ref, helpersHash)`, any permsHash / data / preparationType
        // — must remain distinct from the applied id.
        bytes32 preparedInstall =
            _getPreparedSetupId(ref, permsHash, helpersHash, data, PreparationType.Installation);
        bytes32 preparedUpdate =
            _getPreparedSetupId(ref, permsHash, helpersHash, data, PreparationType.Update);
        bytes32 preparedUninstall =
            _getPreparedSetupId(ref, permsHash, helpersHash, data, PreparationType.Uninstallation);

        assertTrue(applied != preparedInstall, "applied vs prepared(install) must not collide");
        assertTrue(applied != preparedUpdate, "applied vs prepared(update) must not collide");
        assertTrue(applied != preparedUninstall, "applied vs prepared(uninstall) must not collide");
    }
}
