// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {_uncheckedAdd, _uncheckedSub} from "../../../../src/common/utils/math/UncheckedMath.sol";

/// @notice Direct tests for `_uncheckedAdd` and `_uncheckedSub` in
/// `src/common/utils/math/UncheckedMath.sol`.
///
/// No upstream TS coverage existed for these helpers — entire surface is
/// the gap recorded in `TESTS.md` §3. Boundary cases verify wrap-around
/// (no panic); fuzz tests verify each helper agrees with the same expression
/// inside an explicit `unchecked` block, pinning behavioural equivalence.
contract UncheckedMathTest is Test {
    // -------------------------------------------------------------------------
    // _uncheckedAdd
    // -------------------------------------------------------------------------

    function test_uncheckedAdd_normalInputs() public pure {
        assertEq(_uncheckedAdd(0, 0), 0);
        assertEq(_uncheckedAdd(1, 2), 3);
        assertEq(_uncheckedAdd(type(uint256).max, 0), type(uint256).max);
        assertEq(_uncheckedAdd(0, type(uint256).max), type(uint256).max);
    }

    function test_uncheckedAdd_wrapsOnOverflow() public pure {
        // `type(uint256).max + 1` wraps to 0 — a checked `+` would panic 0x11.
        assertEq(_uncheckedAdd(type(uint256).max, 1), 0);
        // `type(uint256).max + 2` wraps to 1.
        assertEq(_uncheckedAdd(type(uint256).max, 2), 1);
        // Two large operands wrap predictably.
        assertEq(_uncheckedAdd(type(uint256).max, type(uint256).max), type(uint256).max - 1);
    }

    // -------------------------------------------------------------------------
    // _uncheckedSub
    // -------------------------------------------------------------------------

    function test_uncheckedSub_normalInputs() public pure {
        assertEq(_uncheckedSub(0, 0), 0);
        assertEq(_uncheckedSub(3, 2), 1);
        assertEq(_uncheckedSub(type(uint256).max, type(uint256).max), 0);
        assertEq(_uncheckedSub(type(uint256).max, 0), type(uint256).max);
    }

    function test_uncheckedSub_wrapsOnUnderflow() public pure {
        // `0 - 1` wraps to `type(uint256).max` — a checked `-` would panic 0x11.
        assertEq(_uncheckedSub(0, 1), type(uint256).max);
        // `0 - 2` wraps to `max - 1`.
        assertEq(_uncheckedSub(0, 2), type(uint256).max - 1);
        // Subtracting more than the minuend wraps proportionally.
        assertEq(_uncheckedSub(5, 10), type(uint256).max - 4);
    }

    // -------------------------------------------------------------------------
    // Fuzzed equivalence to inline `unchecked` blocks
    // -------------------------------------------------------------------------

    /// `_uncheckedAdd(a, b)` agrees with `unchecked { a + b }` for any inputs.
    /// Pins the helper to the canonical wrap-on-overflow semantics so a future
    /// refactor that accidentally re-introduces checked arithmetic fails here.
    function testFuzz_uncheckedAdd_equalsInlineUnchecked(uint256 a, uint256 b) public pure {
        uint256 expected;
        unchecked {
            expected = a + b;
        }
        assertEq(_uncheckedAdd(a, b), expected);
    }

    /// `_uncheckedSub(a, b)` agrees with `unchecked { a - b }` for any inputs.
    function testFuzz_uncheckedSub_equalsInlineUnchecked(uint256 a, uint256 b) public pure {
        uint256 expected;
        unchecked {
            expected = a - b;
        }
        assertEq(_uncheckedSub(a, b), expected);
    }
}
