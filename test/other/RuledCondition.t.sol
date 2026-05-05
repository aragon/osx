// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";

import {RuledCondition} from "../../src/common/permission/condition/extensions/RuledCondition.sol";
import {PermissionCondition} from "../../src/common/permission/condition/PermissionCondition.sol";

/// @notice Concrete `RuledCondition` for tests. Exposes `_updateRules` and
/// drives `_evalRule(0, ...)` from a public entrypoint.
contract RuledConditionHarness is RuledCondition {
    function setRules(Rule[] memory _rules) external {
        _updateRules(_rules);
    }

    function isGranted(
        address _where,
        address _who,
        bytes32 _permissionId,
        bytes calldata _data
    ) external view returns (bool) {
        uint256[] memory compareList;
        if (_data.length > 0) {
            compareList = abi.decode(_data, (uint256[]));
        }
        return _evalRule(0, _where, _who, _permissionId, compareList);
    }
}

/// @notice Returns true only when `(_where, _who)` matches the configured pair.
/// Asymmetry is the point: any swap in upstream evaluation flips the verdict.
contract AddressCheckConditionMock is PermissionCondition {
    address public expectedWhere;
    address public expectedWho;

    function setExpected(
        address _expectedWhere,
        address _expectedWho
    ) external {
        expectedWhere = _expectedWhere;
        expectedWho = _expectedWho;
    }

    function isGranted(
        address _where,
        address _who,
        bytes32,
        bytes memory
    ) external view returns (bool) {
        return _where == expectedWhere && _who == expectedWho;
    }
}

contract RuledConditionEvalLogicTest is Test {
    // RuledCondition's id/op constants are private; redeclare with the exact
    // values from `RuledCondition.sol` rather than reach into private storage.
    // A renumbering upstream would itself be a bug worth catching.
    uint8 internal constant CONDITION_RULE_ID = 202;
    uint8 internal constant LOGIC_OP_RULE_ID = 203;
    uint8 internal constant VALUE_RULE_ID = 204;

    uint8 internal constant OP_EQ = 1; // Op.EQ
    uint8 internal constant OP_RET = 7; // Op.RET
    uint8 internal constant OP_AND = 9; // Op.AND
    uint8 internal constant OP_IF_ELSE = 12; // Op.IF_ELSE

    RuledConditionHarness internal harness;
    AddressCheckConditionMock internal predicate;

    address internal expectedWhere = makeAddr("expectedWhere");
    address internal expectedWho = makeAddr("expectedWho");
    address internal someoneElse = makeAddr("someoneElse");

    bytes32 internal constant PERM = keccak256("SOME_PERMISSION");

    function setUp() public {
        harness = new RuledConditionHarness();
        predicate = new AddressCheckConditionMock();
        predicate.setExpected(expectedWhere, expectedWho);
    }

    /// @notice Loads an IF_ELSE rule whose predicate is the asymmetric
    /// AddressCheckConditionMock.
    /// Rules:
    ///   [0] IF_ELSE(predicate=1, success=2, failure=3)
    ///   [1] CONDITION(predicate) op=EQ -- predicate's verdict cast against `comparedTo == 1`
    ///   [2] VALUE(1) op=RET -- success branch returns true
    ///   [3] VALUE(0) op=RET -- failure branch returns false
    function _loadIfElseRules() internal {
        RuledCondition.Rule[] memory rules = new RuledCondition.Rule[](4);
        rules[0] = RuledCondition.Rule({
            id: LOGIC_OP_RULE_ID,
            op: OP_IF_ELSE,
            value: harness.encodeIfElse(1, 2, 3),
            permissionId: PERM
        });
        rules[1] = RuledCondition.Rule({
            id: CONDITION_RULE_ID,
            op: OP_EQ,
            value: uint240(uint160(address(predicate))),
            permissionId: PERM
        });
        rules[2] = RuledCondition.Rule({
            id: VALUE_RULE_ID,
            op: OP_RET,
            value: 1,
            permissionId: PERM
        });
        rules[3] = RuledCondition.Rule({
            id: VALUE_RULE_ID,
            op: OP_RET,
            value: 0,
            permissionId: PERM
        });
        harness.setRules(rules);
    }

    // -------------------------------------------------------------------------
    // C-1 regression
    // -------------------------------------------------------------------------

    /// @notice With the args in the correct order, the predicate matches and
    /// the success branch fires. Sanity check that the rules are wired.
    function test_C1_IfElsePredicate_RoutesToSuccessOnMatch() public {
        _loadIfElseRules();
        assertTrue(
            harness.isGranted(expectedWhere, expectedWho, PERM, bytes("")),
            "predicate matches: success branch should return true"
        );
    }

    /// @notice With a non-matching `_who`, the predicate fails and the
    /// failure branch fires. Sanity check.
    function test_C1_IfElsePredicate_RoutesToFailureOnMismatch() public {
        _loadIfElseRules();
        assertFalse(
            harness.isGranted(expectedWhere, someoneElse, PERM, bytes("")),
            "predicate does not match: failure branch should return false"
        );
    }

    /// @notice C-1: with `(_where, _who)` swapped at the call site, the
    /// predicate must NOT match. Pre-fix, `_evalLogic` swaps them again
    /// internally (line 181) and the asymmetric predicate sees the original
    /// pair, returning true and routing to the success branch. Post-fix the
    /// swap is gone and the predicate correctly sees `(expectedWho, expectedWhere)`,
    /// which does not match.
    function test_C1_IfElsePredicate_SwappedArgsMustNotMatch() public {
        _loadIfElseRules();
        assertFalse(
            harness.isGranted(
                expectedWho, // _where -- intentionally swapped
                expectedWhere, // _who  -- intentionally swapped
                PERM,
                bytes("")
            ),
            "swapped args must not satisfy the asymmetric predicate"
        );
    }

    // -------------------------------------------------------------------------
    // C-1 propagation through an intermediate AND/OR layer in the predicate.
    // AND/OR don't introduce their own swap, so the bug carries through.
    // -------------------------------------------------------------------------

    function _loadIfElseThroughAndRules() internal {
        // Rules:
        //   [0] IF_ELSE(predicate=1, success=2, failure=3)
        //   [1] AND(rule=4, rule=5) -- predicate via AND
        //   [2] VALUE(1) op=RET -- success
        //   [3] VALUE(0) op=RET -- failure
        //   [4] CONDITION(predicate) op=EQ
        //   [5] VALUE(1) op=RET -- AND collapses to rule 4
        RuledCondition.Rule[] memory rules = new RuledCondition.Rule[](6);
        rules[0] = RuledCondition.Rule({
            id: LOGIC_OP_RULE_ID,
            op: OP_IF_ELSE,
            value: harness.encodeIfElse(1, 2, 3),
            permissionId: PERM
        });
        rules[1] = RuledCondition.Rule({
            id: LOGIC_OP_RULE_ID,
            op: OP_AND,
            value: harness.encodeLogicalOperator(4, 5),
            permissionId: PERM
        });
        rules[2] = RuledCondition.Rule({
            id: VALUE_RULE_ID,
            op: OP_RET,
            value: 1,
            permissionId: PERM
        });
        rules[3] = RuledCondition.Rule({
            id: VALUE_RULE_ID,
            op: OP_RET,
            value: 0,
            permissionId: PERM
        });
        rules[4] = RuledCondition.Rule({
            id: CONDITION_RULE_ID,
            op: OP_EQ,
            value: uint240(uint160(address(predicate))),
            permissionId: PERM
        });
        rules[5] = RuledCondition.Rule({
            id: VALUE_RULE_ID,
            op: OP_RET,
            value: 1,
            permissionId: PERM
        });
        harness.setRules(rules);
    }

    function test_C1_IfElseThroughAnd_RoutesToSuccessOnMatch() public {
        _loadIfElseThroughAndRules();
        assertTrue(
            harness.isGranted(expectedWhere, expectedWho, PERM, bytes("")),
            "AND-wrapped predicate matches: success branch should return true"
        );
    }

    function test_C1_IfElseThroughAnd_SwappedArgsMustNotMatch() public {
        _loadIfElseThroughAndRules();
        assertFalse(
            harness.isGranted(expectedWho, expectedWhere, PERM, bytes("")),
            "C-1 (through AND): swapped args must not satisfy the asymmetric predicate"
        );
    }

    function test_C1_BranchEvaluation_UsesCorrectArgsForRecursion() public {
        // Predicate is always-true (VALUE 1 RET), so the success branch
        // always runs. The success branch is the asymmetric CONDITION; its
        // verdict is the test's signal.
        //
        // Rules:
        //   [0] IF_ELSE(predicate=1, success=2, failure=3)
        //   [1] VALUE(1) op=RET -- predicate is always true
        //   [2] CONDITION(predicate) op=EQ -- success branch
        //   [3] VALUE(0) op=RET -- failure branch (unused)
        RuledCondition.Rule[] memory rules = new RuledCondition.Rule[](4);
        rules[0] = RuledCondition.Rule({
            id: LOGIC_OP_RULE_ID,
            op: OP_IF_ELSE,
            value: harness.encodeIfElse(1, 2, 3),
            permissionId: PERM
        });
        rules[1] = RuledCondition.Rule({
            id: VALUE_RULE_ID,
            op: OP_RET,
            value: 1,
            permissionId: PERM
        });
        rules[2] = RuledCondition.Rule({
            id: CONDITION_RULE_ID,
            op: OP_EQ,
            value: uint240(uint160(address(predicate))),
            permissionId: PERM
        });
        rules[3] = RuledCondition.Rule({
            id: VALUE_RULE_ID,
            op: OP_RET,
            value: 0,
            permissionId: PERM
        });
        harness.setRules(rules);

        assertTrue(
            harness.isGranted(expectedWhere, expectedWho, PERM, bytes("")),
            "success branch: predicate must see (expectedWhere, expectedWho)"
        );
        assertFalse(
            harness.isGranted(expectedWho, expectedWhere, PERM, bytes("")),
            "success branch: swapped args must not satisfy the predicate"
        );
    }
}
