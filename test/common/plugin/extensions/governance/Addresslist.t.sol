// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {Addresslist} from "../../../../../src/common/plugin/extensions/governance/Addresslist.sol";
import {AddresslistMock} from "../../../../mocks/commons/plugin/extensions/governance/AddresslistMock.sol";

/// @notice Direct tests for `Addresslist` in
/// `src/common/plugin/extensions/governance/Addresslist.sol`.
///
/// Ports `osx-commons/contracts/test/plugin/extensions/governance/addresslist.ts`.
/// Each TS step that advanced the chain via `evm_mine` is reproduced with
/// `vm.roll(block.number + 1)` so the checkpoint reads target distinct blocks.
/// Closes the gaps from `TESTS.md` §11: large-array behaviour, exact-block
/// precision, off-by-one window around the boundary block.
contract AddresslistTest is Test {
    AddresslistMock internal addresslist;
    address internal alice;
    address internal bob;
    address internal carol;

    function setUp() public {
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        carol = makeAddr("carol");
        addresslist = new AddresslistMock();
        // Start at a block far from genesis so we can read `block.number - 1`
        // without falling off the chain (some Foundry versions choke at 0).
        vm.roll(100);
    }

    // -------------------------------------------------------------------------
    // addresslistLength
    // -------------------------------------------------------------------------

    function test_addresslistLength_growsWithAdditions() public {
        assertEq(addresslist.addresslistLength(), 0);

        _add(alice);
        assertEq(addresslist.addresslistLength(), 1);

        _add2(bob, carol);
        assertEq(addresslist.addresslistLength(), 3);
    }

    function test_addresslistLength_shrinksWithRemovals() public {
        _add3(alice, bob, carol);
        assertEq(addresslist.addresslistLength(), 3);

        _remove(alice);
        assertEq(addresslist.addresslistLength(), 2);

        _remove2(bob, carol);
        assertEq(addresslist.addresslistLength(), 0);
    }

    // -------------------------------------------------------------------------
    // addresslistLengthAtBlock
    // -------------------------------------------------------------------------

    function test_addresslistLengthAtBlock_reflectsAddHistory() public {
        // tx1 at block B1 adds alice → length 1
        uint256 b1 = block.number;
        _add(alice);
        vm.roll(block.number + 1);

        // tx2 at block B2 adds bob+carol → length 3
        uint256 b2 = block.number;
        _add2(bob, carol);
        vm.roll(block.number + 1);

        assertEq(addresslist.addresslistLengthAtBlock(b1 - 1), 0);
        assertEq(addresslist.addresslistLengthAtBlock(b1), 1);
        assertEq(addresslist.addresslistLengthAtBlock(b2), 3);
    }

    function test_addresslistLengthAtBlock_reflectsRemovalHistory() public {
        uint256 b1 = block.number;
        _add3(alice, bob, carol);
        vm.roll(block.number + 1);

        uint256 b2 = block.number;
        _remove(alice);
        vm.roll(block.number + 1);

        uint256 b3 = block.number;
        _remove2(bob, carol);
        vm.roll(block.number + 1);

        assertLt(b1, b2);
        assertLt(b2, b3);

        assertEq(addresslist.addresslistLengthAtBlock(b1), 3);
        assertEq(addresslist.addresslistLengthAtBlock(b2), 2);
        assertEq(addresslist.addresslistLengthAtBlock(b3), 0);
    }

    // -------------------------------------------------------------------------
    // isListed
    // -------------------------------------------------------------------------

    function test_isListed_returnsTrueIfListed() public {
        _add(alice);
        vm.roll(block.number + 1);
        assertTrue(addresslist.isListed(alice));
    }

    function test_isListed_returnsFalseIfNotListed() public view {
        assertFalse(addresslist.isListed(alice));
    }

    // -------------------------------------------------------------------------
    // isListedAtBlock
    // -------------------------------------------------------------------------

    function test_isListedAtBlock_returnsTrueAtSpecificBlock() public {
        uint256 b1 = block.number;
        _add(alice);
        vm.roll(block.number + 1);

        uint256 b2 = block.number;
        _remove(alice);
        vm.roll(block.number + 1);

        assertLt(b1, b2);
        assertTrue(addresslist.isListedAtBlock(alice, b1));
        assertFalse(addresslist.isListedAtBlock(alice, b2));
    }

    function test_isListedAtBlock_returnsFalseAtPriorBlock() public {
        uint256 b1 = block.number;
        _add(alice);
        vm.roll(block.number + 1);

        // GAP: precision check — the very block before the add must report false.
        assertFalse(addresslist.isListedAtBlock(alice, b1 - 1));
        assertTrue(addresslist.isListedAtBlock(alice, b1));
    }

    // -------------------------------------------------------------------------
    // addAddresses
    // -------------------------------------------------------------------------

    function test_addAddresses_addsAllProvidedEntries() public {
        assertFalse(addresslist.isListed(alice));
        assertFalse(addresslist.isListed(bob));
        assertEq(addresslist.addresslistLength(), 0);

        _add2(alice, bob);
        vm.roll(block.number + 1);

        assertTrue(addresslist.isListed(alice));
        assertTrue(addresslist.isListed(bob));
        assertEq(addresslist.addresslistLength(), 2);
    }

    function test_addAddresses_revertsIfMemberAlreadyListed() public {
        _add2(alice, carol);
        vm.roll(block.number + 1);
        assertEq(addresslist.addresslistLength(), 2);

        // Try to add bob and carol; carol is already listed so the call reverts
        // on the second iteration.
        address[] memory batch = new address[](2);
        batch[0] = bob;
        batch[1] = carol;
        vm.expectRevert(abi.encodeWithSelector(Addresslist.InvalidAddresslistUpdate.selector, carol));
        addresslist.addAddresses(batch);

        vm.roll(block.number + 1);
        assertTrue(addresslist.isListed(alice));
        assertTrue(addresslist.isListed(carol));
        assertFalse(addresslist.isListed(bob));
        assertEq(addresslist.addresslistLength(), 2);
    }

    function test_addAddresses_revertsIfDuplicatesInBatch() public {
        address[] memory batch = new address[](2);
        batch[0] = alice;
        batch[1] = alice;
        vm.expectRevert(abi.encodeWithSelector(Addresslist.InvalidAddresslistUpdate.selector, alice));
        addresslist.addAddresses(batch);
    }

    // -------------------------------------------------------------------------
    // removeAddresses
    // -------------------------------------------------------------------------

    function test_removeAddresses_removesAllProvidedEntries() public {
        _add2(alice, bob);
        vm.roll(block.number + 1);

        assertTrue(addresslist.isListed(alice));
        assertTrue(addresslist.isListed(bob));
        assertEq(addresslist.addresslistLength(), 2);

        _remove2(alice, bob);
        vm.roll(block.number + 1);

        assertFalse(addresslist.isListed(alice));
        assertFalse(addresslist.isListed(bob));
        assertEq(addresslist.addresslistLength(), 0);
    }

    function test_removeAddresses_revertsIfMemberNotListed() public {
        _add2(alice, bob);
        vm.roll(block.number + 1);
        assertEq(addresslist.addresslistLength(), 2);

        // Try to remove bob and carol; carol is not listed.
        address[] memory batch = new address[](2);
        batch[0] = bob;
        batch[1] = carol;
        vm.expectRevert(abi.encodeWithSelector(Addresslist.InvalidAddresslistUpdate.selector, carol));
        addresslist.removeAddresses(batch);

        vm.roll(block.number + 1);
        assertTrue(addresslist.isListed(alice));
        assertTrue(addresslist.isListed(bob));
        assertEq(addresslist.addresslistLength(), 2);
    }

    function test_removeAddresses_revertsIfDuplicatesInBatch() public {
        _add2(alice, bob);
        vm.roll(block.number + 1);

        address[] memory batch = new address[](2);
        batch[0] = alice;
        batch[1] = alice;
        vm.expectRevert(abi.encodeWithSelector(Addresslist.InvalidAddresslistUpdate.selector, alice));
        addresslist.removeAddresses(batch);
    }

    // -------------------------------------------------------------------------
    // GAP — large-array behaviour (closes flaw log F18)
    // -------------------------------------------------------------------------

    /// 256 distinct addresses round-trip through add and remove cleanly. Locks
    /// in the `_uncheckedAdd` / `_uncheckedSub` checkpoint writes against
    /// silent overflow on large inputs.
    function test_addAndRemove_largeArray() public {
        uint256 N = 256;
        address[] memory many = new address[](N);
        for (uint256 i = 0; i < N; i++) {
            many[i] = address(uint160(0x1000 + i));
        }

        addresslist.addAddresses(many);
        vm.roll(block.number + 1);
        assertEq(addresslist.addresslistLength(), N);

        for (uint256 i = 0; i < N; i++) {
            assertTrue(addresslist.isListed(many[i]));
        }

        addresslist.removeAddresses(many);
        vm.roll(block.number + 1);
        assertEq(addresslist.addresslistLength(), 0);
    }

    // -------------------------------------------------------------------------
    // Internal helpers — terse wrappers over single/double/triple add+remove.
    // -------------------------------------------------------------------------

    function _add(address a) internal {
        address[] memory arr = new address[](1);
        arr[0] = a;
        addresslist.addAddresses(arr);
    }

    function _add2(address a, address b) internal {
        address[] memory arr = new address[](2);
        arr[0] = a;
        arr[1] = b;
        addresslist.addAddresses(arr);
    }

    function _add3(address a, address b, address c) internal {
        address[] memory arr = new address[](3);
        arr[0] = a;
        arr[1] = b;
        arr[2] = c;
        addresslist.addAddresses(arr);
    }

    function _remove(address a) internal {
        address[] memory arr = new address[](1);
        arr[0] = a;
        addresslist.removeAddresses(arr);
    }

    function _remove2(address a, address b) internal {
        address[] memory arr = new address[](2);
        arr[0] = a;
        arr[1] = b;
        addresslist.removeAddresses(arr);
    }
}
