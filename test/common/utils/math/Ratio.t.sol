// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, stdError} from "forge-std/Test.sol";
import {RATIO_BASE, _applyRatioCeiled, RatioOutOfBounds} from "../../../../src/common/utils/math/Ratio.sol";

/// @notice Direct tests for `RATIO_BASE` and `_applyRatioCeiled` in
/// `src/common/utils/math/Ratio.sol`.
///
/// Ports `osx-commons/contracts/test/utils/math/ratio.ts` and adds the
/// identity case (ratio == base), zero-value, zero-ratio, distinct revert
/// paths for `RatioOutOfBounds` vs arithmetic overflow, and the inclusive-
/// boundary property.
contract RatioTest is Test {
    /// 50% in `RATIO_BASE` units. Replaces the TS `pctToRatio(50)` SDK helper.
    uint256 internal constant HALF = RATIO_BASE / 2;

    /// External wrapper used to force `_applyRatioCeiled` calls into a child
    /// frame so `vm.expectRevert` can intercept them. File-level functions
    /// otherwise inline into the test contract and reverts collapse to the
    /// test's own frame.
    function applyRatioCeiledExt(
        uint256 value,
        uint256 ratio
    ) external pure returns (uint256) {
        return _applyRatioCeiled(value, ratio);
    }

    // -------------------------------------------------------------------------
    // RATIO_BASE
    // -------------------------------------------------------------------------

    function test_RATIO_BASE_is10ToThe6() public pure {
        assertEq(RATIO_BASE, 10 ** 6);
        assertEq(RATIO_BASE, 1_000_000);
    }

    // -------------------------------------------------------------------------
    // _applyRatioCeiled — happy paths
    // -------------------------------------------------------------------------

    function test_applyRatioCeiled_noRemainderDoesNotCeil() public pure {
        // 32 * 0.5 == 16 exactly — no ceiling applied.
        assertEq(_applyRatioCeiled(32, HALF), 16);
    }

    function test_applyRatioCeiled_remainderCeils() public pure {
        // 33 * 0.5 == 16.5 → ceils to 17.
        assertEq(_applyRatioCeiled(33, HALF), 17);
    }

    function test_applyRatioCeiled_ratioEqualsBaseReturnsValueUnchanged()
        public
        pure
    {
        // GAP: ratio == RATIO_BASE is the identity case.
        assertEq(_applyRatioCeiled(123, RATIO_BASE), 123);
        assertEq(_applyRatioCeiled(0, RATIO_BASE), 0);
        assertEq(_applyRatioCeiled(1, RATIO_BASE), 1);
        assertEq(
            _applyRatioCeiled(type(uint128).max, RATIO_BASE),
            type(uint128).max
        );
    }

    function test_applyRatioCeiled_zeroValueReturnsZero() public pure {
        // GAP: value == 0 collapses to 0 regardless of ratio.
        assertEq(_applyRatioCeiled(0, 0), 0);
        assertEq(_applyRatioCeiled(0, 1), 0);
        assertEq(_applyRatioCeiled(0, HALF), 0);
        assertEq(_applyRatioCeiled(0, RATIO_BASE), 0);
    }

    function test_applyRatioCeiled_zeroRatioReturnsZero() public pure {
        // GAP: ratio == 0 collapses to 0 regardless of value.
        assertEq(_applyRatioCeiled(0, 0), 0);
        assertEq(_applyRatioCeiled(1, 0), 0);
        assertEq(_applyRatioCeiled(type(uint128).max, 0), 0);
    }

    // -------------------------------------------------------------------------
    // _applyRatioCeiled — revert paths
    // -------------------------------------------------------------------------

    function test_applyRatioCeiled_revertsIfRatioExceedsBase() public {
        uint256 tooBig = RATIO_BASE + 1;
        vm.expectRevert(
            abi.encodeWithSelector(
                RatioOutOfBounds.selector,
                RATIO_BASE,
                tooBig
            )
        );
        this.applyRatioCeiledExt(123, tooBig);
    }

    function test_applyRatioCeiled_revertEncodesActualRatio() public {
        // GAP: the custom error must carry the exact actual ratio in its second arg,
        // not just any too-large value.
        uint256 max = type(uint256).max;
        vm.expectRevert(
            abi.encodeWithSelector(RatioOutOfBounds.selector, RATIO_BASE, max)
        );
        this.applyRatioCeiledExt(0, max);
    }

    function test_applyRatioCeiled_ratioAtBaseDoesNotRevert() public pure {
        // Boundary is inclusive on the success side: ratio == RATIO_BASE is allowed.
        _applyRatioCeiled(123, RATIO_BASE);
    }

    function test_applyRatioCeiled_revertsOnArithmeticOverflow() public {
        // GAP: distinct revert path from `RatioOutOfBounds`. Ratio is in-bounds; the
        // overflow happens inside `_value * _ratio`.
        uint256 overflowValue = type(uint256).max / RATIO_BASE + 1;
        vm.expectRevert(stdError.arithmeticError);
        this.applyRatioCeiledExt(overflowValue, RATIO_BASE);
    }

    function test_applyRatioCeiled_justBelowOverflowDoesNotRevert()
        public
        pure
    {
        // The largest value that does NOT overflow `_value * RATIO_BASE`.
        uint256 borderValue = type(uint256).max / RATIO_BASE;
        _applyRatioCeiled(borderValue, RATIO_BASE);
    }

    // -------------------------------------------------------------------------
    // Fuzzed invariants
    // -------------------------------------------------------------------------

    /// For any in-bounds ratio, the ceiled result never exceeds `value`. Even with
    /// ceiling, applying a ratio in `[0, 1]` to `value` cannot grow it.
    /// `value` bounded to `uint128` to stay inside the no-overflow envelope
    /// (`uint128 << uint256.max / RATIO_BASE`).
    function testFuzz_applyRatioCeiled_resultNeverExceedsValue(
        uint128 value,
        uint256 ratio
    ) public pure {
        ratio = bound(ratio, 0, RATIO_BASE);
        assertLe(_applyRatioCeiled(uint256(value), ratio), uint256(value));
    }

    /// `ratio == RATIO_BASE` is the identity function on `value` for any value
    /// that does not overflow `value * RATIO_BASE`.
    function testFuzz_applyRatioCeiled_baseRatioIsIdentity(
        uint256 value
    ) public pure {
        value = bound(value, 0, type(uint256).max / RATIO_BASE);
        assertEq(_applyRatioCeiled(value, RATIO_BASE), value);
    }
}
