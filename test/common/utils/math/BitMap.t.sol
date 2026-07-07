// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {hasBit, flipBit} from "../../../../src/common/utils/math/BitMap.sol";

/// @notice Direct tests for the `hasBit` / `flipBit` file-level functions
/// in `src/common/utils/math/BitMap.sol`.
///
/// Ports `osx-commons/contracts/test/utils/math/bitmap.ts` and adds boundary
/// coverage at index 255, bit-position isolation, and three cross-function
/// invariants expressed as fuzz tests.
contract BitMapTest is Test {
    uint256 internal constant ZEROS = 0;
    uint256 internal constant ONES = type(uint256).max;

    // -------------------------------------------------------------------------
    // hasBit
    // -------------------------------------------------------------------------

    function test_hasBit_exampleBitmapValue6() public pure {
        // 6 == 0b0110 — only indices 1 and 2 are set.
        uint256 bm = 6;
        assertFalse(hasBit(bm, 0));
        assertTrue(hasBit(bm, 1));
        assertTrue(hasBit(bm, 2));
        assertFalse(hasBit(bm, 3));
    }

    function test_hasBit_allZeros() public pure {
        // Exhaustive — `index` is `uint8`, so 256 values cover the entire input space.
        for (uint256 i = 0; i < 256; i++) {
            assertFalse(hasBit(ZEROS, uint8(i)));
        }
    }

    function test_hasBit_allOnes() public pure {
        for (uint256 i = 0; i < 256; i++) {
            assertTrue(hasBit(ONES, uint8(i)));
        }
    }

    function test_hasBit_maxIndex255() public pure {
        // Boundary at uint8(255) — the MSB of a 256-bit word.
        uint256 onlyTopBit = uint256(1) << 255;
        assertTrue(hasBit(onlyTopBit, 255));
        assertFalse(hasBit(onlyTopBit, 0));
        assertFalse(hasBit(onlyTopBit, 1));
        assertFalse(hasBit(onlyTopBit, 254));
    }

    function test_hasBit_isolatesIndividualBits() public pure {
        // 0xAA == 0b10101010 — alternating bits over indices 0..7.
        uint256 bm = 0xAA;
        assertFalse(hasBit(bm, 0));
        assertTrue(hasBit(bm, 1));
        assertFalse(hasBit(bm, 2));
        assertTrue(hasBit(bm, 3));
        assertFalse(hasBit(bm, 4));
        assertTrue(hasBit(bm, 5));
        assertFalse(hasBit(bm, 6));
        assertTrue(hasBit(bm, 7));
        // Indices above the populated nibble are zero.
        assertFalse(hasBit(bm, 8));
        assertFalse(hasBit(bm, 255));
    }

    // -------------------------------------------------------------------------
    // flipBit
    // -------------------------------------------------------------------------

    function test_flipBit_zerosToOnes() public pure {
        uint256 bm = ZEROS;

        assertFalse(hasBit(bm, 0));
        bm = flipBit(bm, 0);
        assertEq(bm, 1);
        assertTrue(hasBit(bm, 0));

        assertFalse(hasBit(bm, 1));
        bm = flipBit(bm, 1);
        assertEq(bm, 3);
        assertTrue(hasBit(bm, 1));
    }

    function test_flipBit_onesToZeros() public pure {
        // Start at 3 (0b11), clear bits 0 and 1 in order.
        uint256 bm = 3;

        assertTrue(hasBit(bm, 0));
        bm = flipBit(bm, 0);
        assertEq(bm, 2);
        assertFalse(hasBit(bm, 0));

        assertTrue(hasBit(bm, 1));
        bm = flipBit(bm, 1);
        assertEq(bm, 0);
        assertFalse(hasBit(bm, 1));
    }

    function test_flipBit_maxIndex255() public pure {
        // Flip the MSB on, then off.
        uint256 bm = flipBit(0, 255);
        assertEq(bm, uint256(1) << 255);
        assertTrue(hasBit(bm, 255));

        bm = flipBit(bm, 255);
        assertEq(bm, 0);
        assertFalse(hasBit(bm, 255));
    }

    // -------------------------------------------------------------------------
    // Cross-function invariants (fuzzed)
    // -------------------------------------------------------------------------

    /// `flipBit` toggles the queried bit, every time, for any bitmap and index.
    /// Invariant: `hasBit(flipBit(bm, i), i) != hasBit(bm, i)`.
    function testFuzz_flipBitTogglesQueriedBit(
        uint256 bm,
        uint8 idx
    ) public pure {
        bool before = hasBit(bm, idx);
        assertEq(hasBit(flipBit(bm, idx), idx), !before);
    }

    /// `flipBit` is its own inverse: `flipBit(flipBit(bm, i), i) == bm`.
    function testFuzz_flipBitIsItsOwnInverse(
        uint256 bm,
        uint8 idx
    ) public pure {
        assertEq(flipBit(flipBit(bm, idx), idx), bm);
    }

    /// `flipBit(bm, i)` leaves every bit other than `i` untouched. Verified by
    /// checking an independent index `j != i` against the original bitmap.
    /// This is the bit-position isolation invariant — a localized version of
    /// the gap test `test_hasBit_isolatesIndividualBits` above.
    function testFuzz_flipBitOnlyAffectsQueriedBit(
        uint256 bm,
        uint8 idx,
        uint8 other
    ) public pure {
        vm.assume(idx != other);
        assertEq(hasBit(flipBit(bm, idx), other), hasBit(bm, other));
    }
}
