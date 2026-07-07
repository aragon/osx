// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm, stdError} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import {PluginRepo} from "../../../../src/framework/plugin/repo/PluginRepo.sol";
import {IPluginRepo} from "../../../../src/framework/plugin/repo/IPluginRepo.sol";
import {PlaceholderSetup} from "../../../../src/framework/plugin/repo/placeholder/PlaceholderSetup.sol";
import {PermissionManager} from "../../../../src/core/permission/PermissionManager.sol";
import {IPermissionCondition} from "../../../../src/common/permission/condition/IPermissionCondition.sol";
import {IProtocolVersion} from "../../../../src/common/utils/versioning/IProtocolVersion.sol";
import {IPluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/IPluginSetup.sol";
import {PermissionConditionMock} from "../../../mocks/permission/PermissionConditionMock.sol";
import {
    PluginUUPSUpgradeableSetupV1Mock
} from "../../../mocks/plugin/UUPSUpgradeable/PluginUUPSUpgradeableSetupMock.sol";
import {PluginUUPSUpgradeableV1Mock} from "../../../mocks/plugin/UUPSUpgradeable/PluginUUPSUpgradeableMock.sol";

/// @dev Shared deploy helpers used by every PluginRepo test contract below.
/// Returns a fresh proxy whose `MAINTAINER_PERMISSION_ID` is held by `owner`.
abstract contract PluginRepoTestBase is Test {
    bytes32 internal constant MAINTAINER_PERMISSION_ID = keccak256("MAINTAINER_PERMISSION");
    bytes32 internal constant UPGRADE_REPO_PERMISSION_ID = keccak256("UPGRADE_REPO_PERMISSION");
    bytes32 internal constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION");

    bytes internal constant BUILD_METADATA = hex"11";
    bytes internal constant RELEASE_METADATA = hex"1111";

    function _deployRepo(address owner) internal returns (PluginRepo) {
        PluginRepo impl = new PluginRepo();
        return PluginRepo(address(new ERC1967Proxy(address(impl), abi.encodeCall(PluginRepo.initialize, (owner)))));
    }

    function _deployMockPluginSetup() internal returns (PluginUUPSUpgradeableSetupV1Mock) {
        PluginUUPSUpgradeableV1Mock pluginImpl = new PluginUUPSUpgradeableV1Mock();
        return new PluginUUPSUpgradeableSetupV1Mock(address(pluginImpl));
    }

    function _tagHash(uint8 release, uint16 build) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(release, build));
    }
}

/// @notice Regression coverage: `PluginRepo` must override
/// `isPermissionRestrictedForAnyAddr` so that the dangerous `MAINTAINER` and
/// `UPGRADE_REPO` permissions cannot be granted to `ANY_ADDR`. Mirrors the
/// `DAO.sol` defense-in-depth pattern.
contract PluginRepoAnyAddrRestrictionTest is Test {
    address internal constant ANY_ADDR = address(type(uint160).max);

    bytes32 internal constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION");
    bytes32 internal constant MAINTAINER_PERMISSION_ID = keccak256("MAINTAINER_PERMISSION");
    bytes32 internal constant UPGRADE_REPO_PERMISSION_ID = keccak256("UPGRADE_REPO_PERMISSION");
    bytes32 internal constant CUSTOM_PERMISSION_ID = keccak256("CUSTOM_PERMISSION");

    PluginRepo internal repo;

    address internal maintainer = address(0xBEEF);
    address internal upgrader = address(0xC0FFEE);
    address internal stranger = address(0xBAD);

    function setUp() public {
        PluginRepo impl = new PluginRepo();
        repo = PluginRepo(
            address(new ERC1967Proxy(address(impl), abi.encodeCall(PluginRepo.initialize, (address(this)))))
        );
    }

    function test_C2_GrantMaintainerToAnyAddr_Reverts() public {
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        repo.grant(address(repo), ANY_ADDR, MAINTAINER_PERMISSION_ID);
    }

    function test_C2_GrantUpgradeRepoToAnyAddr_Reverts() public {
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        repo.grant(address(repo), ANY_ADDR, UPGRADE_REPO_PERMISSION_ID);
    }

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

    function test_C2_GrantRootToAnyAddr_StillReverts() public {
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        repo.grant(address(repo), ANY_ADDR, ROOT_PERMISSION_ID);
    }

    function test_C2_GrantOtherPermissionToAnyAddr_StillSucceeds() public {
        repo.grant(address(repo), ANY_ADDR, CUSTOM_PERMISSION_ID);
        assertTrue(
            repo.isGranted(address(repo), stranger, CUSTOM_PERMISSION_ID, bytes("")),
            "Non-restricted permission must still flow through ANY_ADDR."
        );
    }

    function test_C2_GrantMaintainerToSpecificAddress_StillSucceeds() public {
        repo.grant(address(repo), maintainer, MAINTAINER_PERMISSION_ID);
        assertTrue(
            repo.isGranted(address(repo), maintainer, MAINTAINER_PERMISSION_ID, bytes("")),
            "Specific MAINTAINER grant must succeed."
        );
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

/// @notice Ports the "Initialize" / "ERC-165" / "Protocol version" /
/// "InitializeFrom" describe blocks from
/// `packages/contracts/test/framework/plugin/plugin-repo.ts`.
contract PluginRepoInitializeTest is PluginRepoTestBase {
    PluginRepo internal repo;

    function setUp() public {
        repo = _deployRepo(address(this));
    }

    function test_initialize_grantsAllPermissionsToInitialOwner() public view {
        assertTrue(repo.isGranted(address(repo), address(this), MAINTAINER_PERMISSION_ID, ""));
        assertTrue(repo.isGranted(address(repo), address(this), UPGRADE_REPO_PERMISSION_ID, ""));
        assertTrue(repo.isGranted(address(repo), address(this), ROOT_PERMISSION_ID, ""));
    }

    function test_initializeFrom_revertsAsPlaceholder() public {
        uint8[3] memory previous = [uint8(1), 3, 0];
        vm.expectRevert();
        repo.initializeFrom(previous, "");
    }

    function test_supportsInterface_returnsFalseForEmptyInterface() public view {
        assertFalse(repo.supportsInterface(0xffffffff));
    }

    function test_supportsInterface_IERC165() public view {
        assertTrue(repo.supportsInterface(type(IERC165).interfaceId));
    }

    function test_supportsInterface_IPluginRepo() public view {
        // The frozen v1.0.0 IPluginRepo interface ID is `0xd4321b40` per the TS.
        assertEq(type(IPluginRepo).interfaceId, bytes4(0xd4321b40));
        assertTrue(repo.supportsInterface(type(IPluginRepo).interfaceId));
    }

    function test_supportsInterface_IProtocolVersion() public view {
        assertTrue(repo.supportsInterface(type(IProtocolVersion).interfaceId));
    }

    function test_protocolVersion_returnsCurrent() public view {
        uint8[3] memory v = repo.protocolVersion();
        assertEq(v[0], 1);
        assertEq(v[1], 4);
        assertEq(v[2], 0);
    }

    /// `IPluginSetup` is the interface that registered setups must support —
    /// the repo itself does NOT (lock in: repo and setup roles are distinct).
    function test_supportsInterface_doesNotSupportIPluginSetup() public view {
        assertFalse(repo.supportsInterface(type(IPluginSetup).interfaceId));
    }

    /// `initialOwner == ANY_ADDR` reverts because ROOT cannot be granted to
    /// ANY_ADDR. Init fails atomically; no partial state.
    function test_initialize_revertsIfOwnerIsAnyAddr() public {
        address ANY_ADDR = address(type(uint160).max);
        PluginRepo impl = new PluginRepo();
        vm.expectRevert(PermissionManager.PermissionsForAnyAddressDisallowed.selector);
        new ERC1967Proxy(address(impl), abi.encodeCall(PluginRepo.initialize, (ANY_ADDR)));
    }

    /// Storage-gap sentinel — `uint256[46] __gap` at the tail of the layout.
    /// If the gap shrinks without a major version bump, upgrade-shaped tests
    /// catch the collision. Probe a slot deep enough to be in the gap on
    /// the current layout (~slot 250) and assert it's untouched.
    function test_storageGap_sentinelSlotIsUnused() public view {
        // The gap on the current layout sits well past the last named state
        // var (`latestRelease` plus the PM/UUPS/ERC165 ancestors). Probe a
        // slot inside the gap range; should be zero on a fresh deploy.
        bytes32 sentinel = bytes32(uint256(250));
        bytes32 raw = vm.load(address(repo), sentinel);
        assertEq(uint256(raw), 0, "gap slot 250 should be unused");
    }
}

/// @notice Ports the "CreateVersion" describe block.
contract PluginRepoCreateVersionTest is PluginRepoTestBase {
    PluginRepo internal repo;
    PluginUUPSUpgradeableSetupV1Mock internal pluginSetupMock;
    address internal stranger = makeAddr("stranger");

    function setUp() public {
        repo = _deployRepo(address(this));
        pluginSetupMock = _deployMockPluginSetup();
    }

    function test_createVersion_revertsIfCallerLacksPermission() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                PermissionManager.Unauthorized.selector, address(repo), stranger, MAINTAINER_PERMISSION_ID
            )
        );
        vm.prank(stranger);
        repo.createVersion(1, address(pluginSetupMock), "", "");
    }

    function test_createVersion_revertsIfPluginSetupIsEOA() public {
        // An EOA-style address has no code; supportsInterface fails closed.
        vm.expectRevert(PluginRepo.InvalidPluginSetupInterface.selector);
        repo.createVersion(1, address(this), "", "");
    }

    function test_createVersion_revertsIfContractDoesNotSupportIPluginSetup() public {
        // The repo itself does not support IPluginSetup.
        vm.expectRevert(PluginRepo.InvalidPluginSetupInterface.selector);
        repo.createVersion(1, address(repo), "", "");
    }

    function test_createVersion_revertsIfPluginNotSetupWithoutSupportsInterface() public {
        // A plugin contract — has `supportsInterface` but not IPluginSetup.
        PluginUUPSUpgradeableV1Mock notASetup = new PluginUUPSUpgradeableV1Mock();
        vm.expectRevert(PluginRepo.InvalidPluginSetupInterface.selector);
        repo.createVersion(1, address(notASetup), "", "");
    }

    function test_createVersion_revertsIfReleaseIsZero() public {
        vm.expectRevert(PluginRepo.ReleaseZeroNotAllowed.selector);
        repo.createVersion(0, address(pluginSetupMock), "", "");
    }

    function test_createVersion_revertsIfReleaseIncrementByMoreThanOne() public {
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);
        vm.expectRevert(abi.encodeWithSelector(PluginRepo.InvalidReleaseIncrement.selector, uint8(1), uint8(3)));
        repo.createVersion(3, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);
    }

    function test_createVersion_revertsIfFirstReleaseMetadataEmpty() public {
        vm.expectRevert(PluginRepo.EmptyReleaseMetadata.selector);
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, "");
    }

    function test_createVersion_revertsIfSameSetupReusedInDifferentRelease() public {
        PluginUUPSUpgradeableSetupV1Mock setup1 = _deployMockPluginSetup();
        PluginUUPSUpgradeableSetupV1Mock setup2 = _deployMockPluginSetup();

        repo.createVersion(1, address(setup1), BUILD_METADATA, RELEASE_METADATA);
        repo.createVersion(2, address(setup2), BUILD_METADATA, RELEASE_METADATA);

        // Re-using setup1 under release 3 reverts with the previous release/build.
        vm.expectRevert(
            abi.encodeWithSelector(
                PluginRepo.PluginSetupAlreadyInPreviousRelease.selector, uint8(1), uint16(1), address(setup1)
            )
        );
        repo.createVersion(3, address(setup1), BUILD_METADATA, RELEASE_METADATA);

        // Re-using setup2 under release 3 also reverts.
        vm.expectRevert(
            abi.encodeWithSelector(
                PluginRepo.PluginSetupAlreadyInPreviousRelease.selector, uint8(2), uint16(1), address(setup2)
            )
        );
        repo.createVersion(3, address(setup2), BUILD_METADATA, RELEASE_METADATA);
    }

    function test_createVersion_emitsVersionCreatedAndReleaseMetadataUpdated() public {
        vm.recordLogs();
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 versionTopic = keccak256("VersionCreated(uint8,uint16,address,bytes)");
        bytes32 releaseTopic = keccak256("ReleaseMetadataUpdated(uint8,bytes)");
        bool versionEmitted;
        bool releaseEmitted;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter != address(repo)) continue;

            if (logs[i].topics[0] == versionTopic) {
                // Topic layout: [sig, pluginSetup]. Only pluginSetup is
                // indexed; release+build+buildMetadata live in data.
                assertEq(logs[i].topics.length, 2, "VersionCreated has 2 topics");
                assertEq(address(uint160(uint256(logs[i].topics[1]))), address(pluginSetupMock), "pluginSetup indexed");

                (uint8 release, uint16 build, bytes memory buildMd) = abi.decode(logs[i].data, (uint8, uint16, bytes));
                assertEq(release, 1, "release in data");
                assertEq(build, 1, "build in data");
                assertEq(buildMd, BUILD_METADATA, "buildMetadata in data");
                versionEmitted = true;
            } else if (logs[i].topics[0] == releaseTopic) {
                // ReleaseMetadataUpdated has NO indexed fields.
                assertEq(logs[i].topics.length, 1, "ReleaseMetadataUpdated has 1 topic (sig only)");
                (uint8 release, bytes memory releaseMd) = abi.decode(logs[i].data, (uint8, bytes));
                assertEq(release, 1, "release in data");
                assertEq(releaseMd, RELEASE_METADATA, "releaseMetadata in data");
                releaseEmitted = true;
            }
        }
        assertTrue(versionEmitted, "VersionCreated not emitted");
        assertTrue(releaseEmitted, "ReleaseMetadataUpdated not emitted");
    }

    function test_createVersion_incrementsBuildNumber() public {
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);
        assertEq(repo.buildCount(1), 1);

        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);
        assertEq(repo.buildCount(1), 2);
    }

    function test_createVersion_incrementsReleaseNumber() public {
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);
        assertEq(repo.latestRelease(), 1);

        PluginUUPSUpgradeableSetupV1Mock setup2 = _deployMockPluginSetup();
        repo.createVersion(2, address(setup2), BUILD_METADATA, RELEASE_METADATA);
        assertEq(repo.latestRelease(), 2);
    }

    function test_createVersion_secondCallWithEmptyMetadataDoesNotEmitReleaseUpdate() public {
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);

        vm.recordLogs();
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, "");
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 releaseTopic = keccak256("ReleaseMetadataUpdated(uint8,bytes)");
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(repo) && logs[i].topics[0] == releaseTopic) {
                revert("ReleaseMetadataUpdated unexpectedly emitted");
            }
        }
    }

    function test_createVersion_allowsPlaceholderBuildsInSameRelease() public {
        PlaceholderSetup placeholder1 = new PlaceholderSetup();
        PlaceholderSetup placeholder2 = new PlaceholderSetup();
        bytes memory zero32 = abi.encode(bytes32(0));

        repo.createVersion(1, address(placeholder1), zero32, zero32);
        repo.createVersion(1, address(placeholder1), zero32, zero32);
        assertEq(repo.buildCount(1), 2);

        repo.createVersion(2, address(placeholder2), zero32, zero32);
        repo.createVersion(2, address(placeholder2), zero32, zero32);
        assertEq(repo.buildCount(2), 2);
    }

    /// Cannot retroactively create a version in an older release — the
    /// arithmetic `_release - latestRelease` underflows when `_release <
    /// latestRelease` and panics (checked-math in Solidity 0.8.x). Lock in.
    function test_createVersion_revertsIfReleaseLessThanLatest() public {
        // Bump latestRelease to 2.
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);
        PluginUUPSUpgradeableSetupV1Mock setup2 = _deployMockPluginSetup();
        repo.createVersion(2, address(setup2), BUILD_METADATA, RELEASE_METADATA);

        // Now attempt to create a "release 1" — arithmetic underflow panic.
        PluginUUPSUpgradeableSetupV1Mock setup3 = _deployMockPluginSetup();
        vm.expectRevert(stdError.arithmeticError);
        repo.createVersion(1, address(setup3), BUILD_METADATA, RELEASE_METADATA);
    }

    /// `_release == 0` reverts BEFORE the increment check — the order of
    /// checks matters when both could fail. Lock in current behaviour.
    function test_createVersion_revertsIfReleaseZeroBeforeIncrementCheck() public {
        // After this, latestRelease == 1; release 0 would underflow if
        // increment check ran first, but ReleaseZeroNotAllowed should fire.
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);

        vm.expectRevert(PluginRepo.ReleaseZeroNotAllowed.selector);
        repo.createVersion(0, address(pluginSetupMock), BUILD_METADATA, "");
    }

    /// Calling createVersion with `_release == latestRelease` succeeds and
    /// must NOT touch `latestRelease` (no spurious write).
    function test_createVersion_sameReleaseDoesNotTouchLatestRelease() public {
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);
        uint8 latestBefore = repo.latestRelease();

        // Same release, different build.
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, "");
        uint8 latestAfter = repo.latestRelease();

        assertEq(latestAfter, latestBefore, "latestRelease must not advance on same-release build");
    }

    /// Bumping release leaves the OLD release's build counter untouched —
    /// release-isolated build numbering.
    function test_createVersion_bumpingReleaseLeavesOldBuildCounterUntouched() public {
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, "");
        assertEq(repo.buildCount(1), 2);

        PluginUUPSUpgradeableSetupV1Mock setup2 = _deployMockPluginSetup();
        repo.createVersion(2, address(setup2), BUILD_METADATA, RELEASE_METADATA);

        assertEq(repo.buildCount(1), 2, "release 1's counter must not change");
        assertEq(repo.buildCount(2), 1, "release 2's counter starts at 1");
    }

    /// A pluginSetup whose `supportsInterface` itself reverts must be caught
    /// by `ERC165CheckerUpgradeable` (it uses staticcall + try/catch). The
    /// repo cleanly reverts `InvalidPluginSetupInterface` — never propagating
    /// the inner revert. Lock in.
    function test_createVersion_revertsIfPluginSetupSupportsInterfaceReverts() public {
        // A 1-byte contract whose any call hits INVALID opcode and reverts.
        address bad = makeAddr("bad");
        vm.etch(bad, hex"fe"); // INVALID

        vm.expectRevert(PluginRepo.InvalidPluginSetupInterface.selector);
        repo.createVersion(1, bad, BUILD_METADATA, RELEASE_METADATA);
    }

    /// `_pluginSetup == address(0)` — `address(0).supportsInterface(...)` is
    /// a call to an empty address; `ERC165CheckerUpgradeable` returns false;
    /// repo reverts `InvalidPluginSetupInterface`.
    function test_createVersion_revertsIfPluginSetupIsZeroAddress() public {
        vm.expectRevert(PluginRepo.InvalidPluginSetupInterface.selector);
        repo.createVersion(1, address(0), BUILD_METADATA, RELEASE_METADATA);
    }

    /// Re-using the same setup in the SAME release overwrites
    /// `latestTagHashForPluginSetup` to point to the LATEST build. Older
    /// builds are still queryable by tag hash, but per-setup view tracks
    /// only the most recent registration.
    function test_createVersion_reusingSetupInSameReleaseOverwritesPerSetupMapping() public {
        // Use placeholder (which can be reused indefinitely) for build 1 and 2.
        PlaceholderSetup placeholder = new PlaceholderSetup();
        bytes memory zero32 = abi.encode(bytes32(0));

        repo.createVersion(1, address(placeholder), zero32, zero32);
        PluginRepo.Version memory afterFirst = repo.getLatestVersion(address(placeholder));
        assertEq(afterFirst.tag.build, 1);

        repo.createVersion(1, address(placeholder), zero32, zero32);
        PluginRepo.Version memory afterSecond = repo.getLatestVersion(address(placeholder));
        assertEq(afterSecond.tag.build, 2, "per-setup mapping points to LATEST build");

        // Build 1 is still queryable via tag.
        PluginRepo.Version memory v1 = repo.getVersion(PluginRepo.Tag({release: 1, build: 1}));
        assertEq(v1.tag.build, 1);
    }

    /// Both events fire in canonical order when release is bumped AND
    /// non-empty release metadata is supplied: `VersionCreated` first,
    /// `ReleaseMetadataUpdated` second. Lock in for log-consumer ordering.
    function test_createVersion_emitsBothEventsInOrderWhenReleaseBumps() public {
        // First create release 1 so we can bump to 2 cleanly.
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);

        vm.recordLogs();
        PluginUUPSUpgradeableSetupV1Mock setup2 = _deployMockPluginSetup();
        repo.createVersion(2, address(setup2), BUILD_METADATA, RELEASE_METADATA);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 versionTopic = keccak256("VersionCreated(uint8,uint16,address,bytes)");
        bytes32 releaseTopic = keccak256("ReleaseMetadataUpdated(uint8,bytes)");
        int256 versionIdx = -1;
        int256 releaseIdx = -1;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter != address(repo)) continue;
            if (logs[i].topics[0] == versionTopic) versionIdx = int256(i);
            else if (logs[i].topics[0] == releaseTopic) releaseIdx = int256(i);
        }
        assertTrue(versionIdx != -1 && releaseIdx != -1, "both events emitted");
        assertLt(versionIdx, releaseIdx, "VersionCreated must precede ReleaseMetadataUpdated");
    }

    /// `_release == latestRelease` + non-empty metadata: BOTH events fire
    /// (the `if (_releaseMetadata.length > 0)` is independent of the
    /// release-bump branch). Lock in: re-emitting release metadata for an
    /// existing release without bumping is allowed.
    function test_createVersion_emitsBothEventsWhenReleaseStaysAndMetadataNonEmpty() public {
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);

        vm.recordLogs();
        // Same release, non-empty metadata.
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 versionTopic = keccak256("VersionCreated(uint8,uint16,address,bytes)");
        bytes32 releaseTopic = keccak256("ReleaseMetadataUpdated(uint8,bytes)");
        bool versionEmitted;
        bool releaseEmitted;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter != address(repo)) continue;
            if (logs[i].topics[0] == versionTopic) versionEmitted = true;
            if (logs[i].topics[0] == releaseTopic) releaseEmitted = true;
        }
        assertTrue(versionEmitted && releaseEmitted, "both events fire even on same-release re-emit");
    }

    /// Atomicity: when `createVersion` reverts on the "setup already in a
    /// previous release" branch, the build counter, version map, per-setup
    /// mapping, and latestRelease must all be unchanged. Lock in via
    /// snapshot pre/post.
    function test_createVersion_stateUnchangedOnRevert() public {
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);
        PluginUUPSUpgradeableSetupV1Mock setup2 = _deployMockPluginSetup();
        repo.createVersion(2, address(setup2), BUILD_METADATA, RELEASE_METADATA);

        // Snapshot.
        uint8 latestBefore = repo.latestRelease();
        uint256 release1BuildsBefore = repo.buildCount(1);
        uint256 release2BuildsBefore = repo.buildCount(2);

        // Attempt to re-use setup1 under release 3 — reverts.
        vm.expectRevert(
            abi.encodeWithSelector(
                PluginRepo.PluginSetupAlreadyInPreviousRelease.selector,
                uint8(1),
                uint16(1),
                address(pluginSetupMock)
            )
        );
        repo.createVersion(3, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);

        // The `if (_release > latestRelease) latestRelease = _release;` line
        // had run before the revert; EVM rollback restores it to the snapshot.
        assertEq(repo.latestRelease(), latestBefore, "latestRelease rolls back");
        assertEq(repo.buildCount(1), release1BuildsBefore, "release 1 build count unchanged");
        assertEq(repo.buildCount(2), release2BuildsBefore, "release 2 build count unchanged");
        assertEq(repo.buildCount(3), 0, "release 3 never created");
    }
}

/// @notice Ports the "updateReleaseMetadata" describe block.
contract PluginRepoUpdateReleaseMetadataTest is PluginRepoTestBase {
    PluginRepo internal repo;
    PluginUUPSUpgradeableSetupV1Mock internal pluginSetupMock;
    address internal stranger = makeAddr("stranger");

    function setUp() public {
        repo = _deployRepo(address(this));
        pluginSetupMock = _deployMockPluginSetup();
    }

    function test_updateReleaseMetadata_revertsIfCallerLacksPermission() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                PermissionManager.Unauthorized.selector, address(repo), stranger, MAINTAINER_PERMISSION_ID
            )
        );
        vm.prank(stranger);
        repo.updateReleaseMetadata(1, RELEASE_METADATA);
    }

    function test_updateReleaseMetadata_revertsIfReleaseIsZero() public {
        vm.expectRevert(PluginRepo.ReleaseZeroNotAllowed.selector);
        repo.updateReleaseMetadata(0, hex"00");
    }

    function test_updateReleaseMetadata_revertsIfReleaseDoesNotExist() public {
        vm.expectRevert(PluginRepo.ReleaseDoesNotExist.selector);
        repo.updateReleaseMetadata(1, hex"00");
    }

    function test_updateReleaseMetadata_revertsIfMetadataIsEmpty() public {
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);
        vm.expectRevert(PluginRepo.EmptyReleaseMetadata.selector);
        repo.updateReleaseMetadata(1, "");
    }

    function test_updateReleaseMetadata_emitsReleaseMetadataUpdated() public {
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);

        vm.recordLogs();
        repo.updateReleaseMetadata(1, hex"11");
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 expectedTopic = keccak256("ReleaseMetadataUpdated(uint8,bytes)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(repo) && logs[i].topics[0] == expectedTopic) {
                assertEq(logs[i].topics.length, 1, "no indexed fields");
                (uint8 release, bytes memory md) = abi.decode(logs[i].data, (uint8, bytes));
                assertEq(release, 1);
                assertEq(md, hex"11");
                found = true;
                break;
            }
        }
        assertTrue(found, "ReleaseMetadataUpdated not emitted");
    }

    /// `updateReleaseMetadata` can retroactively update an OLDER release's
    /// metadata (the gate is `_release > latestRelease`, not `>=`).
    function test_updateReleaseMetadata_succeedsForOlderRelease() public {
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);
        PluginUUPSUpgradeableSetupV1Mock setup2 = _deployMockPluginSetup();
        repo.createVersion(2, address(setup2), BUILD_METADATA, RELEASE_METADATA);

        // latestRelease == 2; update older release 1.
        bytes memory newMd = hex"deadbeef";
        vm.recordLogs();
        repo.updateReleaseMetadata(1, newMd);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 topic = keccak256("ReleaseMetadataUpdated(uint8,bytes)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(repo) && logs[i].topics[0] == topic) {
                (uint8 r, bytes memory md) = abi.decode(logs[i].data, (uint8, bytes));
                if (r == 1 && keccak256(md) == keccak256(newMd)) {
                    found = true;
                    break;
                }
            }
        }
        assertTrue(found, "ReleaseMetadataUpdated for older release not emitted");
    }

    /// Multiple updates each emit their own event.
    function test_updateReleaseMetadata_multipleUpdatesEmitMultipleEvents() public {
        repo.createVersion(1, address(pluginSetupMock), BUILD_METADATA, RELEASE_METADATA);

        vm.recordLogs();
        repo.updateReleaseMetadata(1, hex"01");
        repo.updateReleaseMetadata(1, hex"02");
        repo.updateReleaseMetadata(1, hex"03");
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 topic = keccak256("ReleaseMetadataUpdated(uint8,bytes)");
        uint256 count;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(repo) && logs[i].topics[0] == topic) count++;
        }
        assertEq(count, 3, "one event per update");
    }
}

/// @notice Ports the "Different types of getVersions" describe block
/// (getLatestVersion + getVersion).
contract PluginRepoGetVersionTest is PluginRepoTestBase {
    PluginRepo internal repo;

    PluginUUPSUpgradeableSetupV1Mock internal setupR1B1;
    PluginUUPSUpgradeableSetupV1Mock internal setupR1B2;
    PluginUUPSUpgradeableSetupV1Mock internal setupR2B1;

    bytes internal constant BUILD_MD_R1_B1 = hex"11";
    bytes internal constant BUILD_MD_R1_B2 = hex"1111";
    bytes internal constant BUILD_MD_R2_B1 = hex"111111";

    function setUp() public {
        repo = _deployRepo(address(this));
        setupR1B1 = _deployMockPluginSetup();
        setupR1B2 = _deployMockPluginSetup();
        setupR2B1 = _deployMockPluginSetup();

        repo.createVersion(1, address(setupR1B1), BUILD_MD_R1_B1, RELEASE_METADATA);
        repo.createVersion(1, address(setupR1B2), BUILD_MD_R1_B2, RELEASE_METADATA);
        repo.createVersion(2, address(setupR2B1), BUILD_MD_R2_B1, RELEASE_METADATA);
    }

    function test_getLatestVersion_byRelease_revertsIfReleaseDoesNotExist() public {
        vm.expectRevert(abi.encodeWithSelector(PluginRepo.VersionHashDoesNotExist.selector, _tagHash(3, 0)));
        repo.getLatestVersion(uint8(3));
    }

    function test_getLatestVersion_byRelease_returnsLatestBuild() public view {
        PluginRepo.Version memory v1 = repo.getLatestVersion(uint8(1));
        assertEq(v1.tag.release, 1);
        assertEq(v1.tag.build, 2);
        assertEq(v1.pluginSetup, address(setupR1B2));
        assertEq(v1.buildMetadata, BUILD_MD_R1_B2);

        PluginRepo.Version memory v2 = repo.getLatestVersion(uint8(2));
        assertEq(v2.tag.release, 2);
        assertEq(v2.tag.build, 1);
        assertEq(v2.pluginSetup, address(setupR2B1));
        assertEq(v2.buildMetadata, BUILD_MD_R2_B1);
    }

    function test_getLatestVersion_byPluginSetup_revertsIfSetupNotKnown() public {
        vm.expectRevert(abi.encodeWithSelector(PluginRepo.VersionHashDoesNotExist.selector, bytes32(0)));
        repo.getLatestVersion(address(0xDEAD));
    }

    function test_getLatestVersion_byPluginSetup_returnsVersionPerSetup() public view {
        PluginRepo.Version memory r1b1 = repo.getLatestVersion(address(setupR1B1));
        assertEq(r1b1.tag.release, 1);
        assertEq(r1b1.tag.build, 1);

        PluginRepo.Version memory r1b2 = repo.getLatestVersion(address(setupR1B2));
        assertEq(r1b2.tag.release, 1);
        assertEq(r1b2.tag.build, 2);

        PluginRepo.Version memory r2b1 = repo.getLatestVersion(address(setupR2B1));
        assertEq(r2b1.tag.release, 2);
        assertEq(r2b1.tag.build, 1);
    }

    function test_getVersion_byTag_revertsIfTagDoesNotExist() public {
        vm.expectRevert(abi.encodeWithSelector(PluginRepo.VersionHashDoesNotExist.selector, _tagHash(1, 3)));
        repo.getVersion(PluginRepo.Tag({release: 1, build: 3}));
    }

    function test_getVersion_byTag_returnsVersion() public view {
        PluginRepo.Version memory v = repo.getVersion(PluginRepo.Tag({release: 2, build: 1}));
        assertEq(v.tag.release, 2);
        assertEq(v.tag.build, 1);
        assertEq(v.pluginSetup, address(setupR2B1));
        assertEq(v.buildMetadata, BUILD_MD_R2_B1);
    }

    function test_getVersion_byTagHash_returnsVersion() public view {
        PluginRepo.Version memory v = repo.getVersion(_tagHash(1, 1));
        assertEq(v.tag.release, 1);
        assertEq(v.tag.build, 1);
        assertEq(v.pluginSetup, address(setupR1B1));
        assertEq(v.buildMetadata, BUILD_MD_R1_B1);
    }

    /// `getLatestVersion(release=0)` reverts via the same `tag.release == 0`
    /// check — `versions[tagHash(0, 0)]` is the default-zero entry.
    function test_getLatestVersion_byRelease_revertsForReleaseZero() public {
        vm.expectRevert(abi.encodeWithSelector(PluginRepo.VersionHashDoesNotExist.selector, _tagHash(0, 0)));
        repo.getLatestVersion(uint8(0));
    }

    /// Re-registering the SAME setup in the SAME release: `getLatestVersion`
    /// by setup returns the LATEST build for that setup. setUp leaves
    /// latestRelease at 2 so we must re-register a release-2 setup here
    /// (re-registering in an older release would arithmetic-panic the
    /// `_release - latestRelease` calculation).
    function test_getLatestVersion_bySetup_returnsLatestBuildIfReused() public {
        // setupR2B1 is currently at (2, 1). Re-register at (2, 2).
        repo.createVersion(2, address(setupR2B1), BUILD_MD_R2_B1, RELEASE_METADATA);

        PluginRepo.Version memory v = repo.getLatestVersion(address(setupR2B1));
        assertEq(v.tag.release, 2);
        assertEq(v.tag.build, 2, "per-setup view tracks latest build");
    }

    /// `getLatestVersion(setup)` is INDEPENDENT of "latest by release".
    /// Registering setupB later doesn't disturb setupA's per-setup pointer.
    /// Lock in.
    function test_getLatestVersion_bySetup_independentOfLatestByRelease() public {
        // setupR1B1 is at (1, 1); setupR1B2 is at (1, 2); setupR2B1 is at (2, 1).
        // setupR1B1's per-setup view should still point to (1, 1) even
        // though (1, 2) and (2, 1) are now "later" in release/build numbering.
        PluginRepo.Version memory v = repo.getLatestVersion(address(setupR1B1));
        assertEq(v.tag.release, 1);
        assertEq(v.tag.build, 1, "setupA's per-setup view stays at its own latest");
    }

    /// `getLatestVersion(address(0))` reverts — `latestTagHashForPluginSetup[0]`
    /// is the default-zero hash; `versions[0].tag.release == 0` → revert.
    function test_getLatestVersion_bySetup_revertsForZeroAddress() public {
        vm.expectRevert(abi.encodeWithSelector(PluginRepo.VersionHashDoesNotExist.selector, bytes32(0)));
        repo.getLatestVersion(address(0));
    }

    /// `getVersion(Tag{release: 0, build: X})` reverts: `versions[tagHash(0,X)].tag.release == 0`.
    function test_getVersion_byTag_revertsForReleaseZero() public {
        vm.expectRevert(abi.encodeWithSelector(PluginRepo.VersionHashDoesNotExist.selector, _tagHash(0, 1)));
        repo.getVersion(PluginRepo.Tag({release: 0, build: 1}));
    }

    /// `getVersion(bytes32(0))` reverts — slot 0 is the default-zero entry.
    function test_getVersion_byTagHash_revertsForZeroHash() public {
        vm.expectRevert(abi.encodeWithSelector(PluginRepo.VersionHashDoesNotExist.selector, bytes32(0)));
        repo.getVersion(bytes32(0));
    }

    /// `buildCount(release)` returns 0 for an unused release.
    function test_buildCount_returnsZeroForUnusedRelease() public view {
        assertEq(repo.buildCount(uint8(5)), 0);
    }

    /// `buildCount(0)` returns 0 — release 0 can never be created so the
    /// underlying mapping default suffices.
    function test_buildCount_returnsZeroForRelease0() public view {
        assertEq(repo.buildCount(uint8(0)), 0);
    }

    /// `buildCount` is per-release; creating a build in release N never
    /// changes release M (M != N) — release-isolated counters.
    function test_buildCount_independentAcrossReleases() public view {
        assertEq(repo.buildCount(uint8(1)), 2, "release 1 has 2 builds");
        assertEq(repo.buildCount(uint8(2)), 1, "release 2 has 1 build");
    }
}

/// @notice `_authorizeUpgrade` — UPGRADE_REPO permission gate.
contract PluginRepoUpgradeAuthTest is PluginRepoTestBase {
    PluginRepo internal repo;
    address internal stranger = makeAddr("stranger");

    function setUp() public {
        repo = _deployRepo(address(this));
    }

    /// A caller without `UPGRADE_REPO_PERMISSION_ID` cannot upgrade — the
    /// `_authorizeUpgrade` hook reverts via the `auth(UPGRADE_REPO_PERMISSION_ID)`
    /// modifier with `Unauthorized`.
    function test_authorizeUpgrade_revertsWithoutUpgradeRepoPermission() public {
        PluginRepo nextImpl = new PluginRepo();

        vm.expectRevert(
            abi.encodeWithSelector(
                PermissionManager.Unauthorized.selector, address(repo), stranger, UPGRADE_REPO_PERMISSION_ID
            )
        );
        vm.prank(stranger);
        repo.upgradeTo(address(nextImpl));
    }

    /// Holding ROOT alone does NOT bypass the `UPGRADE_REPO_PERMISSION_ID`
    /// check — the `auth` modifier checks the SPECIFIC permission. Lock in:
    /// strangers granted ROOT (but not UPGRADE_REPO) cannot upgrade.
    function test_authorizeUpgrade_rootOnlyDoesNotBypass() public {
        // Grant ROOT to a stranger but withhold UPGRADE_REPO.
        repo.grant(address(repo), stranger, ROOT_PERMISSION_ID);

        PluginRepo nextImpl = new PluginRepo();
        vm.expectRevert(
            abi.encodeWithSelector(
                PermissionManager.Unauthorized.selector, address(repo), stranger, UPGRADE_REPO_PERMISSION_ID
            )
        );
        vm.prank(stranger);
        repo.upgradeTo(address(nextImpl));
    }

    /// Conversely: a holder of `UPGRADE_REPO_PERMISSION_ID` (no other perms)
    /// can upgrade. Establishes the positive control for N1/N3.
    function test_authorizeUpgrade_succeedsWithUpgradeRepoPermission() public {
        address upgrader = makeAddr("upgrader");
        repo.grant(address(repo), upgrader, UPGRADE_REPO_PERMISSION_ID);

        PluginRepo nextImpl = new PluginRepo();
        vm.prank(upgrader);
        repo.upgradeTo(address(nextImpl));

        // Read the ERC1967 implementation slot to confirm the upgrade landed.
        bytes32 IMPL_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
        bytes32 raw = vm.load(address(repo), IMPL_SLOT);
        assertEq(address(uint160(uint256(raw))), address(nextImpl), "implementation slot updated");
    }
}
