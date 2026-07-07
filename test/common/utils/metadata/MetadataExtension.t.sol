// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IDAO} from "../../../../src/common/dao/IDAO.sol";
import {DaoUnauthorized} from "../../../../src/common/permission/auth/auth.sol";
import {MetadataExtensionMock} from "../../../mocks/commons/utils/metadata/MetadataExtensionMock.sol";
import {MetadataExtensionUpgradeableMock} from "../../../mocks/commons/utils/metadata/MetadataExtensionUpgradeableMock.sol";
import {DAOMock} from "../../../mocks/commons/dao/DAOMock.sol";

/// @dev Minimal shape that both `MetadataExtensionMock` and
/// `MetadataExtensionUpgradeableMock` expose. Used both as a function-selector
/// source for the ERC-165 ID and as a typed handle in the shared tests.
interface IMetadataExtension {
    function setMetadata(bytes calldata _metadata) external;

    function getMetadata() external view returns (bytes memory);

    function supportsInterface(
        bytes4 _interfaceId
    ) external view returns (bool);
}

/// @notice Shared behaviour tests for `MetadataExtension` and
/// `MetadataExtensionUpgradeable` in `src/common/utils/metadata/`.
///
/// Ports `osx-commons/contracts/test/utils/metadata.ts` and adds empty /
/// large payload roundtrips, an explicit XOR selector check, the auth guard
/// verified via `DaoUnauthorized`, event-after-state-change ordering, and
/// (Upgradeable only) hard-coded storage slot isolation via `vm.load`.
abstract contract MetadataExtensionSharedTest is Test {
    DAOMock internal daoMock;
    IMetadataExtension internal target;
    address internal bob;

    /// `MetadataExtension`'s `supportsInterface` returns true for this XOR
    /// (per source); pre-computed here so the assertion is double-anchored.
    bytes4 internal immutable METADATA_SELECTOR_INTERFACE_ID =
        IMetadataExtension.setMetadata.selector ^
            IMetadataExtension.getMetadata.selector;

    function _deployTarget() internal virtual returns (IMetadataExtension);

    function setUp() public virtual {
        bob = makeAddr("bob");
        daoMock = new DAOMock();
        target = _deployTarget();
        // Default: any caller passes the auth check unless a test flips this back.
        daoMock.setHasPermissionReturnValueMock(true);
    }

    // -------------------------------------------------------------------------
    // ERC-165
    // -------------------------------------------------------------------------

    function test_supportsInterface_ERC165() public view {
        assertTrue(target.supportsInterface(type(IERC165).interfaceId));
    }

    function test_supportsInterface_metadataXorSelector() public view {
        assertTrue(target.supportsInterface(METADATA_SELECTOR_INTERFACE_ID));
        // Sanity: confirm the precomputed XOR equals the inline computation
        // anyone could verify with `cast sig`.
        assertEq(METADATA_SELECTOR_INTERFACE_ID, bytes4(0x940cac36));
    }

    function test_supportsInterface_returnsFalseForUnknownInterface()
        public
        view
    {
        assertFalse(target.supportsInterface(0xdeadbeef));
    }

    // -------------------------------------------------------------------------
    // setMetadata / getMetadata
    // -------------------------------------------------------------------------

    function test_setMetadata_revertsIfCallerLacksPermission() public {
        daoMock.setHasPermissionReturnValueMock(false);
        // Match only the selector — the four-arg payload is exercised by
        // `DaoAuthorizable.t.sol` and need not be re-verified here.
        vm.expectPartialRevert(DaoUnauthorized.selector);
        vm.prank(bob);
        target.setMetadata(hex"11");
    }

    function test_setMetadata_emitsMetadataSetWithExactPayload() public {
        bytes memory payload = hex"11";
        vm.recordLogs();
        target.setMetadata(payload);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 expectedTopic = keccak256("MetadataSet(bytes)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (
                logs[i].topics[0] == expectedTopic &&
                logs[i].emitter == address(target)
            ) {
                bytes memory decoded = abi.decode(logs[i].data, (bytes));
                assertEq(decoded, payload);
                found = true;
                break;
            }
        }
        assertTrue(found, "MetadataSet not emitted by target");
    }

    function test_getMetadata_returnsLastSet() public {
        bytes memory payload = hex"11";
        target.setMetadata(payload);
        assertEq(target.getMetadata(), payload);
    }

    function test_getMetadata_handlesPayloadLargerThan32Bytes() public {
        // Stress sstore/sload semantics for `bytes` storage: a 50-byte payload
        // straddles two storage slots. Repeats the TS suite's check.
        bytes memory big = new bytes(50);
        for (uint256 i = 0; i < 50; i++) {
            big[i] = 0x11;
        }
        target.setMetadata(big);
        assertEq(target.getMetadata(), big);
    }

    function test_getMetadata_emptyPayloadRoundtrips() public {
        // GAP: empty bytes accepted and retrievable.
        target.setMetadata("");
        assertEq(target.getMetadata().length, 0);
    }

    function test_setMetadata_overwritesPreviousValue() public {
        target.setMetadata(hex"11");
        target.setMetadata(hex"22");
        assertEq(target.getMetadata(), hex"22");
    }

    function test_setMetadata_stateUpdatedBeforeEvent() public {
        // GAP: event emitted *after* the state change. We can't observe two
        // states from outside a single transaction, but we can confirm the
        // emitted bytes match the value `getMetadata()` returns immediately
        // after — which proves the storage write happened by then.
        bytes memory payload = hex"deadbeef";
        vm.recordLogs();
        target.setMetadata(payload);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(target.getMetadata(), payload);

        bytes32 expectedTopic = keccak256("MetadataSet(bytes)");
        for (uint256 i = 0; i < logs.length; i++) {
            if (
                logs[i].topics[0] == expectedTopic &&
                logs[i].emitter == address(target)
            ) {
                assertEq(abi.decode(logs[i].data, (bytes)), payload);
                return;
            }
        }
        revert("MetadataSet not emitted");
    }

    /// Before any `setMetadata`, `getMetadata()` returns empty bytes — locks
    /// in the initial state (no default seed, no inherited value).
    function test_getMetadata_initialStateIsEmpty() public view {
        assertEq(target.getMetadata().length, 0);
    }

    /// Each `setMetadata` call emits exactly one `MetadataSet` event — no
    /// dedup/skip when the new value equals the old.
    function test_setMetadata_eachCallEmitsItsOwnEvent() public {
        vm.recordLogs();
        target.setMetadata(hex"01");
        target.setMetadata(hex"01"); // same value — must still emit
        target.setMetadata(hex"02");
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 expectedTopic = keccak256("MetadataSet(bytes)");
        uint256 count;
        for (uint256 i = 0; i < logs.length; i++) {
            if (
                logs[i].topics[0] == expectedTopic &&
                logs[i].emitter == address(target)
            ) {
                count++;
            }
        }
        assertEq(count, 3, "MetadataSet emitted once per call");
    }
}

/// @notice Constructable variant.
contract MetadataExtensionTest is MetadataExtensionSharedTest {
    function _deployTarget() internal override returns (IMetadataExtension) {
        return
            IMetadataExtension(
                address(new MetadataExtensionMock(IDAO(address(daoMock))))
            );
    }
}

/// @notice Upgradeable variant — adds the hard-coded storage-slot isolation
/// test for `MetadataExtensionUpgradeable`.
contract MetadataExtensionUpgradeableTest is MetadataExtensionSharedTest {
    /// `keccak256(abi.encode(uint256(keccak256("osx-commons.storage.MetadataExtension")) - 1)) & ~bytes32(uint256(0xff))`
    /// — duplicated verbatim from `MetadataExtensionUpgradeable.sol`.
    bytes32 internal constant METADATA_STORAGE_SLOT =
        0x47ff9796f72d439c6e5c30a24b9fad985a00c85a9f2258074c400a94f8746b00;

    function _deployTarget() internal override returns (IMetadataExtension) {
        MetadataExtensionUpgradeableMock impl = new MetadataExtensionUpgradeableMock();
        impl.initialize(IDAO(address(daoMock)));
        return IMetadataExtension(address(impl));
    }

    function test_setMetadata_writesToHardcodedStorageSlot() public {
        bytes memory payload = hex"42";
        target.setMetadata(payload);

        // The `bytes` struct member sits at slot `METADATA_STORAGE_SLOT` (struct
        // has a single field, so it's the first slot). For a short bytes value
        // (< 32 bytes), OZ packs `value | (length * 2)` into the slot.
        bytes32 raw = vm.load(address(target), METADATA_STORAGE_SLOT);
        // The low byte encodes `length * 2` for short bytes. payload is 1 byte
        // long, so the low byte is 2.
        assertEq(
            uint256(raw) & 0xff,
            2,
            "short-bytes length encoding mismatch"
        );
        // The high byte holds the payload itself.
        assertEq(uint256(raw) >> 248, 0x42, "short-bytes value mismatch");
    }

    /// The storage-slot constant in `MetadataExtensionUpgradeable` is documented
    /// as the ERC-7201 namespaced derivation:
    /// `keccak256(abi.encode(uint256(keccak256(seed)) - 1)) & ~bytes32(uint256(0xff))`.
    /// If either the constant or the seed string drifts without the other
    /// being updated, this catches the divergence.
    function test_storageSlot_matchesErc7201Derivation() public pure {
        bytes32 derived = keccak256(
            abi.encode(uint256(keccak256("osx-commons.storage.MetadataExtension")) - 1)
        ) & ~bytes32(uint256(0xff));
        assertEq(derived, METADATA_STORAGE_SLOT, "storage slot must match ERC-7201 derivation");
    }
}
