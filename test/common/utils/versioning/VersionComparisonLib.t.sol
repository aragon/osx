// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {VersionComparisonLib} from "../../../../src/common/utils/versioning/VersionComparisonLib.sol";

/// @notice Direct tests for `VersionComparisonLib` in
/// `src/common/utils/versioning/VersionComparisonLib.sol`.
///
/// Ports `osx-commons/contracts/test/utils/versioning/version-comparison-lib.ts`
/// and adds the gap items from `TESTS.md` §4:
///   - boundary versions [0,0,0] / [255,255,255] / asymmetric extremes,
///   - the logical-consistency invariant `!lt(a,b) && !eq(a,b) ⇔ gt(a,b)`
///     plus the lte/gte duals (closes central flaw log F16),
///   - transitivity of `lt`.
///
/// The TS suite uses three matrix helpers (`eqChecks`, `ltChecks`, `gtChecks`)
/// shared across all 6 operators. The same DRY shape is preserved here via
/// internal helpers that take a function reference to a per-op wrapper.
contract VersionComparisonLibTest is Test {
    using VersionComparisonLib for uint8[3];

    // -------------------------------------------------------------------------
    // Per-operator wrappers
    //
    // Internal function references to library functions are not addressable
    // directly through `using`; each operator gets a tiny wrapper on the test
    // contract so we can pass it by reference into the matrix helpers below.
    // -------------------------------------------------------------------------

    function _opEq(uint8[3] memory l, uint8[3] memory r) internal pure returns (bool) {
        return l.eq(r);
    }

    function _opNeq(uint8[3] memory l, uint8[3] memory r) internal pure returns (bool) {
        return l.neq(r);
    }

    function _opLt(uint8[3] memory l, uint8[3] memory r) internal pure returns (bool) {
        return l.lt(r);
    }

    function _opLte(uint8[3] memory l, uint8[3] memory r) internal pure returns (bool) {
        return l.lte(r);
    }

    function _opGt(uint8[3] memory l, uint8[3] memory r) internal pure returns (bool) {
        return l.gt(r);
    }

    function _opGte(uint8[3] memory l, uint8[3] memory r) internal pure returns (bool) {
        return l.gte(r);
    }

    function _v(uint8 a, uint8 b, uint8 c) internal pure returns (uint8[3] memory v) {
        v[0] = a;
        v[1] = b;
        v[2] = c;
    }

    // -------------------------------------------------------------------------
    // Matrix helpers — mirror the TS `eqChecks` / `ltChecks` / `gtChecks` shape
    // -------------------------------------------------------------------------

    /// 8 pairs where `lhs == rhs`. Covers every "all-zero subset" combination
    /// of the three semver components, including the all-zero and all-one vectors.
    function _runEqualPairs(function(uint8[3] memory, uint8[3] memory) internal pure returns (bool) op, bool expected)
        internal
        pure
    {
        assertEq(op(_v(1, 1, 1), _v(1, 1, 1)), expected);
        assertEq(op(_v(0, 1, 1), _v(0, 1, 1)), expected);
        assertEq(op(_v(1, 0, 1), _v(1, 0, 1)), expected);
        assertEq(op(_v(1, 1, 0), _v(1, 1, 0)), expected);
        assertEq(op(_v(1, 0, 0), _v(1, 0, 0)), expected);
        assertEq(op(_v(0, 1, 0), _v(0, 1, 0)), expected);
        assertEq(op(_v(0, 0, 1), _v(0, 0, 1)), expected);
        assertEq(op(_v(0, 0, 0), _v(0, 0, 0)), expected);
    }

    /// 16 pairs where `lhs < rhs` — exercises every single-component step-up
    /// as well as multi-component variations.
    function _runLtPairs(function(uint8[3] memory, uint8[3] memory) internal pure returns (bool) op, bool expected)
        internal
        pure
    {
        // Single-component bumps from [1,1,1].
        assertEq(op(_v(1, 1, 1), _v(2, 1, 1)), expected);
        assertEq(op(_v(1, 1, 1), _v(1, 2, 1)), expected);
        assertEq(op(_v(1, 1, 1), _v(1, 1, 2)), expected);
        // Two-component bumps.
        assertEq(op(_v(1, 1, 1), _v(1, 2, 2)), expected);
        assertEq(op(_v(1, 1, 1), _v(2, 1, 2)), expected);
        assertEq(op(_v(1, 1, 1), _v(2, 2, 1)), expected);
        // Three-component bump.
        assertEq(op(_v(1, 1, 1), _v(2, 2, 2)), expected);
        // Patch = 0 on both sides — ensure trailing zeros don't break ordering.
        assertEq(op(_v(1, 1, 0), _v(1, 2, 0)), expected);
        assertEq(op(_v(1, 1, 0), _v(2, 1, 0)), expected);
        assertEq(op(_v(1, 1, 0), _v(2, 2, 0)), expected);
        // Major = 0 — pre-1.x versions still compare on minor/patch.
        assertEq(op(_v(0, 1, 1), _v(0, 1, 2)), expected);
        assertEq(op(_v(0, 1, 1), _v(0, 2, 1)), expected);
        assertEq(op(_v(0, 1, 1), _v(0, 2, 2)), expected);
        // GAP: per-component isolation — only one slot non-zero.
        assertEq(op(_v(1, 0, 0), _v(2, 0, 0)), expected);
        assertEq(op(_v(0, 1, 0), _v(0, 2, 0)), expected);
        assertEq(op(_v(0, 0, 1), _v(0, 0, 2)), expected);
    }

    /// Mirror of `_runLtPairs` with sides swapped.
    function _runGtPairs(function(uint8[3] memory, uint8[3] memory) internal pure returns (bool) op, bool expected)
        internal
        pure
    {
        assertEq(op(_v(2, 1, 1), _v(1, 1, 1)), expected);
        assertEq(op(_v(1, 2, 1), _v(1, 1, 1)), expected);
        assertEq(op(_v(1, 1, 2), _v(1, 1, 1)), expected);
        assertEq(op(_v(1, 2, 2), _v(1, 1, 1)), expected);
        assertEq(op(_v(2, 1, 2), _v(1, 1, 1)), expected);
        assertEq(op(_v(2, 2, 1), _v(1, 1, 1)), expected);
        assertEq(op(_v(2, 2, 2), _v(1, 1, 1)), expected);
        assertEq(op(_v(1, 2, 0), _v(1, 1, 0)), expected);
        assertEq(op(_v(2, 1, 0), _v(1, 1, 0)), expected);
        assertEq(op(_v(2, 2, 0), _v(1, 1, 0)), expected);
        assertEq(op(_v(0, 1, 2), _v(0, 1, 1)), expected);
        assertEq(op(_v(0, 2, 1), _v(0, 1, 1)), expected);
        assertEq(op(_v(0, 2, 2), _v(0, 1, 1)), expected);
        assertEq(op(_v(2, 0, 0), _v(1, 0, 0)), expected);
        assertEq(op(_v(0, 2, 0), _v(0, 1, 0)), expected);
        assertEq(op(_v(0, 0, 2), _v(0, 0, 1)), expected);
    }

    // -------------------------------------------------------------------------
    // eq
    // -------------------------------------------------------------------------

    function test_eq_returnsTrueIfLhsEqualsRhs() public pure {
        _runEqualPairs(_opEq, true);
    }

    function test_eq_returnsFalseIfLhsDoesNotEqualRhs() public pure {
        _runLtPairs(_opEq, false);
        _runGtPairs(_opEq, false);
    }

    // -------------------------------------------------------------------------
    // neq
    // -------------------------------------------------------------------------

    function test_neq_returnsTrueIfLhsDoesNotEqualRhs() public pure {
        _runLtPairs(_opNeq, true);
        _runGtPairs(_opNeq, true);
    }

    function test_neq_returnsFalseIfLhsEqualsRhs() public pure {
        _runEqualPairs(_opNeq, false);
    }

    // -------------------------------------------------------------------------
    // lt
    // -------------------------------------------------------------------------

    function test_lt_returnsTrueIfLhsLessThanRhs() public pure {
        _runLtPairs(_opLt, true);
    }

    function test_lt_returnsFalseIfLhsNotLessThanRhs() public pure {
        _runGtPairs(_opLt, false);
        _runEqualPairs(_opLt, false);
    }

    // -------------------------------------------------------------------------
    // lte
    // -------------------------------------------------------------------------

    function test_lte_returnsTrueIfLhsLessThanOrEqualRhs() public pure {
        _runLtPairs(_opLte, true);
        _runEqualPairs(_opLte, true);
    }

    function test_lte_returnsFalseIfLhsGreaterThanRhs() public pure {
        _runGtPairs(_opLte, false);
    }

    // -------------------------------------------------------------------------
    // gt
    // -------------------------------------------------------------------------

    function test_gt_returnsTrueIfLhsGreaterThanRhs() public pure {
        _runGtPairs(_opGt, true);
    }

    function test_gt_returnsFalseIfLhsNotGreaterThanRhs() public pure {
        _runLtPairs(_opGt, false);
        _runEqualPairs(_opGt, false);
    }

    // -------------------------------------------------------------------------
    // gte
    // -------------------------------------------------------------------------

    function test_gte_returnsTrueIfLhsGreaterThanOrEqualRhs() public pure {
        _runGtPairs(_opGte, true);
        _runEqualPairs(_opGte, true);
    }

    function test_gte_returnsFalseIfLhsLessThanRhs() public pure {
        _runLtPairs(_opGte, false);
    }

    // -------------------------------------------------------------------------
    // Boundary versions (GAP)
    // -------------------------------------------------------------------------

    function test_boundary_minAndMaxVersionsCompareCorrectly() public pure {
        uint8[3] memory zero = _v(0, 0, 0);
        uint8[3] memory max = _v(255, 255, 255);

        // Equality reflexive at boundaries.
        assertTrue(zero.eq(zero));
        assertTrue(max.eq(max));

        // zero < max in every operator that orders strictly.
        assertTrue(zero.lt(max));
        assertFalse(zero.gt(max));
        assertTrue(zero.lte(max));
        assertFalse(zero.gte(max));
        assertTrue(zero.neq(max));

        // Asymmetric extremes — [255,0,0] vs [0,0,255]: major dominates.
        assertTrue(_v(255, 0, 0).gt(_v(0, 0, 255)));
        assertFalse(_v(255, 0, 0).lt(_v(0, 0, 255)));

        // [0,0,255] vs [0,1,0]: minor dominates over patch.
        assertTrue(_v(0, 1, 0).gt(_v(0, 0, 255)));
        assertFalse(_v(0, 1, 0).lt(_v(0, 0, 255)));
    }

    // -------------------------------------------------------------------------
    // Logical-consistency invariants (GAP — closes central log F16)
    // -------------------------------------------------------------------------

    /// Exactly one of `lt`, `eq`, `gt` is true for any pair. The TS suite never
    /// asserted the full trichotomy across the 6 operators; locking it in here
    /// catches a class of subtle operator-drift bugs.
    function testFuzz_trichotomy(uint8[3] memory a, uint8[3] memory b) public pure {
        bool isLt = a.lt(b);
        bool isEq = a.eq(b);
        bool isGt = a.gt(b);

        // Exactly one of the three holds.
        uint256 trueCount = (isLt ? 1 : 0) + (isEq ? 1 : 0) + (isGt ? 1 : 0);
        assertEq(trueCount, 1);
    }

    /// `neq` is the negation of `eq`.
    function testFuzz_neqIsNegationOfEq(uint8[3] memory a, uint8[3] memory b) public pure {
        assertEq(a.neq(b), !a.eq(b));
    }

    /// `lte` is `lt || eq`. Same shape for `gte`.
    function testFuzz_lteEqualsLtOrEq(uint8[3] memory a, uint8[3] memory b) public pure {
        assertEq(a.lte(b), a.lt(b) || a.eq(b));
    }

    function testFuzz_gteEqualsGtOrEq(uint8[3] memory a, uint8[3] memory b) public pure {
        assertEq(a.gte(b), a.gt(b) || a.eq(b));
    }

    /// `!lt(a,b) && !eq(a,b) ⇔ gt(a,b)` — the consistency invariant called out
    /// in `TESTS.md` F16.
    function testFuzz_consistencyAcrossOperators(uint8[3] memory a, uint8[3] memory b) public pure {
        assertEq(!a.lt(b) && !a.eq(b), a.gt(b));
    }

    /// `lt` is transitive: `lt(a, b) && lt(b, c) ⇒ lt(a, c)`.
    function testFuzz_ltIsTransitive(uint8[3] memory a, uint8[3] memory b, uint8[3] memory c) public pure {
        vm.assume(a.lt(b) && b.lt(c));
        assertTrue(a.lt(c));
    }
}
