// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IPermissionCondition} from "../../../../../src/common/permission/condition/IPermissionCondition.sol";
import {IProtocolVersion} from "../../../../../src/common/utils/versioning/IProtocolVersion.sol";
import {RuledCondition} from "../../../../../src/common/permission/condition/extensions/RuledCondition.sol";
import {RuledConditionMock} from "../../../../mocks/commons/permission/condition/extensions/RuledConditionMock.sol";
import {PermissionConditionMock} from "../../../../mocks/commons/permission/condition/PermissionConditionMock.sol";
import {DAOMock} from "../../../../mocks/commons/dao/DAOMock.sol";

/// @dev Always reverts. Used to verify `_checkCondition` swallows external
/// reverts and returns false (no propagation).
contract RevertingConditionMock is IPermissionCondition {
    function isGranted(
        address,
        address,
        bytes32,
        bytes calldata
    ) external pure override returns (bool) {
        revert("nope");
    }
}

/// @dev Returns a non-32-byte payload from `isGranted`. Used to verify
/// `_checkCondition` rejects malformed returndata as false.
contract WeirdReturndataConditionMock {
    fallback() external {
        // Return 64 bytes of garbage (not the expected 32-byte bool).
        bytes memory data = abi.encode(uint256(1), uint256(1));
        assembly {
            return(add(data, 0x20), mload(data))
        }
    }
}

/// @notice Direct tests for `RuledCondition` in
/// `src/common/permission/condition/extensions/RuledCondition.sol`.
///
/// Ports `osx-commons/contracts/test/permission/condition/extensions/ruled-condition.ts`
/// (1,069 lines, 24 TS cases). The IF_ELSE argument-order regression is owned
/// by `test/other/RuledCondition.t.sol`; not duplicated here. Adds:
/// `_checkCondition` revert / malformed-returndata handling, encode/decode
/// round-trips, empty-array clear, large-array push.
contract RuledConditionTest is Test {
    /// Rule-id constants — duplicated from the source (where they are `internal`).
    uint8 internal constant BLOCK_NUMBER_RULE_ID = 200;
    uint8 internal constant TIMESTAMP_RULE_ID = 201;
    uint8 internal constant CONDITION_RULE_ID = 202;
    uint8 internal constant LOGIC_OP_RULE_ID = 203;
    uint8 internal constant VALUE_RULE_ID = 204;

    /// Op enum positions.
    uint8 internal constant OP_NONE = 0;
    uint8 internal constant OP_EQ = 1;
    uint8 internal constant OP_NEQ = 2;
    uint8 internal constant OP_GT = 3;
    uint8 internal constant OP_LT = 4;
    uint8 internal constant OP_GTE = 5;
    uint8 internal constant OP_LTE = 6;
    uint8 internal constant OP_RET = 7;
    uint8 internal constant OP_NOT = 8;
    uint8 internal constant OP_AND = 9;
    uint8 internal constant OP_OR = 10;
    uint8 internal constant OP_XOR = 11;
    uint8 internal constant OP_IF_ELSE = 12;

    bytes32 internal constant DUMMY_PERMISSION = keccak256("DUMMY_PERMISSION");

    RuledConditionMock internal ruled;
    PermissionConditionMock internal subA;
    PermissionConditionMock internal subB;
    PermissionConditionMock internal subC;
    DAOMock internal daoMock;

    address internal deployer;

    function setUp() public {
        deployer = address(this);
        daoMock = new DAOMock();
        ruled = new RuledConditionMock();
        subA = new PermissionConditionMock();
        subB = new PermissionConditionMock();
        subC = new PermissionConditionMock();
    }

    // -------------------------------------------------------------------------
    // Rule construction helpers — Solidity analogues of the TS factories.
    // -------------------------------------------------------------------------

    function _rule(
        uint8 id,
        uint8 op,
        uint240 value
    ) internal pure returns (RuledCondition.Rule memory) {
        return
            RuledCondition.Rule({
                id: id,
                op: op,
                value: value,
                permissionId: DUMMY_PERMISSION
            });
    }

    function _conditionAddr(
        IPermissionCondition cond
    ) internal pure returns (uint240) {
        return uint240(uint160(address(cond)));
    }

    function _isGranted(uint256[] memory list) internal view returns (bool) {
        bytes memory data = list.length == 0 ? bytes("") : abi.encode(list);
        return
            ruled.isGranted(address(daoMock), deployer, DUMMY_PERMISSION, data);
    }

    function _isGrantedEmpty() internal view returns (bool) {
        return
            ruled.isGranted(address(daoMock), deployer, DUMMY_PERMISSION, "");
    }

    // Rule-array factories that mirror the TS `*_rule` helpers.

    function _logicABRule(
        uint8 op
    ) internal view returns (RuledCondition.Rule[] memory rs) {
        rs = new RuledCondition.Rule[](3);
        rs[0] = _rule(LOGIC_OP_RULE_ID, op, ruled.encodeLogicalOperator(1, 2));
        rs[1] = _rule(CONDITION_RULE_ID, OP_EQ, _conditionAddr(subA));
        rs[2] = _rule(CONDITION_RULE_ID, OP_EQ, _conditionAddr(subB));
    }

    function _notRule(
        uint240 value
    ) internal view returns (RuledCondition.Rule[] memory rs) {
        rs = new RuledCondition.Rule[](2);
        rs[0] = _rule(
            LOGIC_OP_RULE_ID,
            OP_NOT,
            ruled.encodeLogicalOperator(1, 2)
        );
        rs[1] = _rule(VALUE_RULE_ID, OP_RET, value);
    }

    function _comparisonRule(
        uint8 op,
        uint240 value
    ) internal pure returns (RuledCondition.Rule[] memory rs) {
        rs = new RuledCondition.Rule[](1);
        // id = 0 → lookup _compareList[0]
        rs[0] = _rule(0, op, value);
    }

    /// `C || (A && B)` — TS `C_or_B_and_A_rule`.
    function _COrAandBRule()
        internal
        view
        returns (RuledCondition.Rule[] memory rs)
    {
        rs = new RuledCondition.Rule[](5);
        rs[0] = _rule(
            LOGIC_OP_RULE_ID,
            OP_OR,
            ruled.encodeLogicalOperator(1, 2)
        );
        rs[1] = _rule(CONDITION_RULE_ID, OP_EQ, _conditionAddr(subC));
        rs[2] = _rule(
            LOGIC_OP_RULE_ID,
            OP_AND,
            ruled.encodeLogicalOperator(3, 4)
        );
        rs[3] = _rule(CONDITION_RULE_ID, OP_EQ, _conditionAddr(subA));
        rs[4] = _rule(CONDITION_RULE_ID, OP_EQ, _conditionAddr(subB));
    }

    /// IF subA THEN ret(1) ELSE subB — TS `if_A_else_B`.
    function _ifAElseBRule()
        internal
        view
        returns (RuledCondition.Rule[] memory rs)
    {
        rs = new RuledCondition.Rule[](4);
        rs[0] = _rule(
            LOGIC_OP_RULE_ID,
            OP_IF_ELSE,
            ruled.encodeIfElse(1, 2, 3)
        );
        rs[1] = _rule(CONDITION_RULE_ID, OP_EQ, _conditionAddr(subA));
        rs[2] = _rule(VALUE_RULE_ID, OP_RET, 1);
        rs[3] = _rule(CONDITION_RULE_ID, OP_EQ, _conditionAddr(subB));
    }

    /// `compareList[0] <= list[1] AND compareList[1] <= list[2]` — TS `three_elements_list_ordered_rule`.
    function _threeElementsOrderedRule(
        uint240 mid,
        uint240 high
    ) internal view returns (RuledCondition.Rule[] memory rs) {
        rs = new RuledCondition.Rule[](3);
        rs[0] = _rule(
            LOGIC_OP_RULE_ID,
            OP_AND,
            ruled.encodeLogicalOperator(1, 2)
        );
        rs[1] = _rule(0, OP_LTE, mid);
        rs[2] = _rule(1, OP_LTE, high);
    }

    // -------------------------------------------------------------------------
    // updateRules + emit
    // -------------------------------------------------------------------------

    function test_updateRules_storesAndEmitsRulesUpdated() public {
        RuledCondition.Rule[] memory rs = new RuledCondition.Rule[](1);
        rs[0] = _rule(CONDITION_RULE_ID, OP_EQ, 777);

        vm.recordLogs();
        ruled.updateRules(rs);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(
            logs[0].topics[0],
            keccak256("RulesUpdated((uint8,uint8,uint240,bytes32)[])")
        );

        RuledCondition.Rule[] memory stored = ruled.getRules();
        assertEq(stored.length, 1);
        assertEq(stored[0].id, CONDITION_RULE_ID);
        assertEq(stored[0].op, OP_EQ);
        assertEq(uint256(stored[0].value), 777);
        assertEq(stored[0].permissionId, DUMMY_PERMISSION);
    }

    // -------------------------------------------------------------------------
    // Simple condition rule (CONDITION_RULE_ID with sub-condition)
    // -------------------------------------------------------------------------

    function test_simpleRule_evaluatesTrue() public {
        RuledCondition.Rule[] memory rs = new RuledCondition.Rule[](1);
        rs[0] = _rule(CONDITION_RULE_ID, OP_EQ, _conditionAddr(subA));
        ruled.updateRules(rs);

        subA.setAnswer(true);
        assertTrue(_isGrantedEmpty());
    }

    function test_simpleRule_evaluatesFalse() public {
        RuledCondition.Rule[] memory rs = new RuledCondition.Rule[](1);
        rs[0] = _rule(CONDITION_RULE_ID, OP_EQ, _conditionAddr(subA));
        ruled.updateRules(rs);

        // subA.answer defaults to false.
        assertFalse(_isGrantedEmpty());
    }

    // -------------------------------------------------------------------------
    // Complex rule: C || (A && B)
    // -------------------------------------------------------------------------

    function test_complexRule_COrAandB_evaluatesTrue() public {
        ruled.updateRules(_COrAandBRule());

        subA.setAnswer(true);
        subB.setAnswer(true);
        // C(false) || (A(true) && B(true)) → true
        assertTrue(_isGrantedEmpty());

        subC.setAnswer(true);
        subA.setAnswer(false);
        subB.setAnswer(false);
        // C(true) || ... → true
        assertTrue(_isGrantedEmpty());
    }

    function test_complexRule_COrAandB_evaluatesFalse() public {
        ruled.updateRules(_COrAandBRule());

        subA.setAnswer(true);
        // C(false) || (A(true) && B(false)) → false
        assertFalse(_isGrantedEmpty());
    }

    // -------------------------------------------------------------------------
    // IF_ELSE — both-branch evaluation (param order is covered by test/other/RuledCondition.t.sol)
    // -------------------------------------------------------------------------

    function test_ifElse_evaluatesBothBranches() public {
        ruled.updateRules(_ifAElseBRule());

        // Both sub-conditions false → IF returns false, ELSE branch (subB) returns false.
        assertFalse(_isGrantedEmpty());

        // subA true → IF branch (VALUE_RULE RET 1) returns true.
        subA.setAnswer(true);
        assertTrue(_isGrantedEmpty());

        // subA false, subB true → ELSE branch (subB) returns true.
        subA.setAnswer(false);
        subB.setAnswer(true);
        assertTrue(_isGrantedEmpty());
    }

    // -------------------------------------------------------------------------
    // BLOCK_NUMBER / TIMESTAMP rules
    // -------------------------------------------------------------------------

    function test_blockNumberRule_evaluatesAgainstBlockNumber() public {
        // block.number ≥ 1 → true
        RuledCondition.Rule[] memory rs = new RuledCondition.Rule[](1);
        rs[0] = _rule(BLOCK_NUMBER_RULE_ID, OP_GTE, 1);
        ruled.updateRules(rs);
        assertTrue(_isGrantedEmpty());

        // block.number < 1 → false (test runs at block.number ≥ 1)
        rs[0] = _rule(BLOCK_NUMBER_RULE_ID, OP_LT, 1);
        ruled.updateRules(rs);
        assertFalse(_isGrantedEmpty());
    }

    function test_timestampRule_evaluatesAgainstTimestamp() public {
        RuledCondition.Rule[] memory rs = new RuledCondition.Rule[](1);
        rs[0] = _rule(TIMESTAMP_RULE_ID, OP_GTE, 1);
        ruled.updateRules(rs);
        assertTrue(_isGrantedEmpty());

        rs[0] = _rule(TIMESTAMP_RULE_ID, OP_LT, 1);
        ruled.updateRules(rs);
        assertFalse(_isGrantedEmpty());
    }

    // -------------------------------------------------------------------------
    // AND / OR / XOR / NOT
    // -------------------------------------------------------------------------

    function test_andOperation() public {
        ruled.updateRules(_logicABRule(OP_AND));

        subA.setAnswer(true);
        subB.setAnswer(true);
        assertTrue(_isGrantedEmpty());

        subA.setAnswer(false);
        subB.setAnswer(true);
        assertFalse(_isGrantedEmpty());

        subA.setAnswer(false);
        subB.setAnswer(false);
        assertFalse(_isGrantedEmpty());

        subA.setAnswer(true);
        subB.setAnswer(false);
        assertFalse(_isGrantedEmpty());
    }

    function test_orOperation() public {
        ruled.updateRules(_logicABRule(OP_OR));

        subA.setAnswer(true);
        subB.setAnswer(false);
        assertTrue(_isGrantedEmpty());

        subA.setAnswer(false);
        subB.setAnswer(true);
        assertTrue(_isGrantedEmpty());

        subA.setAnswer(true);
        subB.setAnswer(true);
        assertTrue(_isGrantedEmpty());

        subA.setAnswer(false);
        subB.setAnswer(false);
        assertFalse(_isGrantedEmpty());
    }

    function test_xorOperation() public {
        ruled.updateRules(_logicABRule(OP_XOR));

        subA.setAnswer(true);
        subB.setAnswer(false);
        assertTrue(_isGrantedEmpty());

        subA.setAnswer(false);
        subB.setAnswer(true);
        assertTrue(_isGrantedEmpty());

        subA.setAnswer(false);
        subB.setAnswer(false);
        assertFalse(_isGrantedEmpty());

        subA.setAnswer(true);
        subB.setAnswer(true);
        assertFalse(_isGrantedEmpty());
    }

    function test_notOperation() public {
        ruled.updateRules(_notRule(0));
        // NOT 0 → true
        assertTrue(_isGrantedEmpty());

        ruled.updateRules(_notRule(1));
        // NOT 1 → false
        assertFalse(_isGrantedEmpty());
    }

    // -------------------------------------------------------------------------
    // Comparison operators against the compareList
    // -------------------------------------------------------------------------

    function test_eqOperation() public {
        ruled.updateRules(_comparisonRule(OP_EQ, 1));

        uint256[] memory list = new uint256[](3);
        list[0] = 1;
        list[1] = 2;
        list[2] = 3;
        assertTrue(_isGranted(list)); // 1 == 1

        list[0] = 2;
        assertFalse(_isGranted(list)); // 2 != 1
    }

    function test_neqOperation() public {
        ruled.updateRules(_comparisonRule(OP_NEQ, 1));

        uint256[] memory list = new uint256[](3);
        list[0] = 2;
        list[1] = 2;
        list[2] = 3;
        assertTrue(_isGranted(list)); // 2 != 1

        list[0] = 1;
        assertFalse(_isGranted(list)); // 1 == 1
    }

    function test_gtOperation() public {
        ruled.updateRules(_comparisonRule(OP_GT, 5));

        uint256[] memory list = new uint256[](3);
        list[0] = 10;
        list[1] = 20;
        list[2] = 30;
        assertTrue(_isGranted(list)); // 10 > 5

        list[0] = 1;
        assertFalse(_isGranted(list)); // 1 < 5
    }

    function test_gteOperation() public {
        ruled.updateRules(_comparisonRule(OP_GTE, 10));

        uint256[] memory list = new uint256[](3);
        list[0] = 10;
        list[1] = 20;
        list[2] = 30;
        assertTrue(_isGranted(list)); // 10 >= 10

        list[0] = 1;
        assertFalse(_isGranted(list)); // 1 < 10
    }

    function test_ltOperation() public {
        ruled.updateRules(_comparisonRule(OP_LT, 10));

        uint256[] memory list = new uint256[](3);
        list[0] = 1;
        list[1] = 2;
        list[2] = 3;
        assertTrue(_isGranted(list)); // 1 < 10

        list[0] = 11;
        assertFalse(_isGranted(list)); // 11 > 10
    }

    function test_lteOperation() public {
        ruled.updateRules(_comparisonRule(OP_LTE, 10));

        uint256[] memory list = new uint256[](3);
        list[0] = 10;
        list[1] = 20;
        list[2] = 30;
        assertTrue(_isGranted(list)); // 10 <= 10

        list[0] = 11;
        assertFalse(_isGranted(list)); // 11 > 10
    }

    function test_noneOperation_returnsFalse() public {
        RuledCondition.Rule[] memory rs = new RuledCondition.Rule[](1);
        // id=1, op=NONE → falls through `_compare`'s switch to `return false`.
        rs[0] = _rule(1, OP_NONE, 2);
        ruled.updateRules(rs);

        uint256[] memory list = new uint256[](3);
        list[0] = 1;
        list[1] = 2;
        list[2] = 3;
        assertFalse(_isGranted(list));
    }

    // -------------------------------------------------------------------------
    // Compare-list checks
    // -------------------------------------------------------------------------

    function test_compareList_orderedAscending() public {
        // list=[1,2,3] with rule "list[0]≤list[1] AND list[1]≤list[2]" → true.
        uint256[] memory list = new uint256[](3);
        list[0] = 1;
        list[1] = 2;
        list[2] = 3;
        ruled.updateRules(
            _threeElementsOrderedRule(uint240(list[1]), uint240(list[2]))
        );
        assertTrue(_isGranted(list));
    }

    function test_compareList_descendingFails() public {
        // list=[3,2,1] — descending; the rule checks list[0]≤2 AND list[1]≤1 → first part false.
        uint256[] memory list = new uint256[](3);
        list[0] = 3;
        list[1] = 2;
        list[2] = 1;
        ruled.updateRules(
            _threeElementsOrderedRule(uint240(list[1]), uint240(list[2]))
        );
        assertFalse(_isGranted(list));
    }

    function test_compareList_outOfOrderMidElement() public {
        // list=[2,3,1] — rule "list[0]≤3 AND list[1]≤1": 2≤3 true, 3≤1 false → false.
        uint256[] memory list = new uint256[](3);
        list[0] = 2;
        list[1] = 3;
        list[2] = 1;
        ruled.updateRules(
            _threeElementsOrderedRule(uint240(list[1]), uint240(list[2]))
        );
        assertFalse(_isGranted(list));
    }

    function test_idLargerThanCompareList_returnsFalse() public {
        // id=5 with list of length 3 → source falls through to `return false`.
        RuledCondition.Rule[] memory rs = new RuledCondition.Rule[](1);
        rs[0] = _rule(5, OP_LTE, 2);
        ruled.updateRules(rs);

        uint256[] memory list = new uint256[](3);
        list[0] = 1;
        list[1] = 2;
        list[2] = 3;
        assertFalse(_isGranted(list));
    }

    // -------------------------------------------------------------------------
    // ERC-165
    // -------------------------------------------------------------------------

    function test_supportsInterface_ERC165() public view {
        assertTrue(ruled.supportsInterface(type(IERC165).interfaceId));
    }

    function test_supportsInterface_IPermissionCondition() public view {
        assertTrue(
            ruled.supportsInterface(type(IPermissionCondition).interfaceId)
        );
    }

    function test_supportsInterface_IProtocolVersion() public view {
        assertTrue(ruled.supportsInterface(type(IProtocolVersion).interfaceId));
    }

    function test_supportsInterface_RuledCondition() public view {
        assertTrue(ruled.supportsInterface(type(RuledCondition).interfaceId));
    }

    function test_supportsInterface_returnsFalseForUnknownInterface()
        public
        view
    {
        assertFalse(ruled.supportsInterface(0xdeadbeef));
    }

    // -------------------------------------------------------------------------
    // GAP: encode/decode round-trips
    // -------------------------------------------------------------------------

    function test_encodeIfElse_decodeRoundTrip() public view {
        uint240 encoded = ruled.encodeIfElse(7, 13, 42);
        (uint32 a, uint32 b, uint32 c) = ruled.decodeRuleValue(
            uint256(encoded)
        );
        assertEq(a, 7);
        assertEq(b, 13);
        assertEq(c, 42);
    }

    function test_encodeLogicalOperator_decodeRoundTrip() public view {
        uint240 encoded = ruled.encodeLogicalOperator(11, 99);
        (uint32 a, uint32 b, ) = ruled.decodeRuleValue(uint256(encoded));
        assertEq(a, 11);
        assertEq(b, 99);
    }

    function testFuzz_encodeIfElse_decodeRoundTrip(
        uint32 a,
        uint32 b,
        uint32 c
    ) public view {
        uint240 encoded = ruled.encodeIfElse(
            uint256(a),
            uint256(b),
            uint256(c)
        );
        (uint32 da, uint32 db, uint32 dc) = ruled.decodeRuleValue(
            uint256(encoded)
        );
        assertEq(da, a);
        assertEq(db, b);
        assertEq(dc, c);
    }

    // -------------------------------------------------------------------------
    // GAP: empty / large rule arrays
    // -------------------------------------------------------------------------

    function test_updateRules_emptyArrayClears() public {
        // Seed with one rule, then clear.
        RuledCondition.Rule[] memory seed = new RuledCondition.Rule[](1);
        seed[0] = _rule(VALUE_RULE_ID, OP_RET, 1);
        ruled.updateRules(seed);
        assertEq(ruled.getRules().length, 1);

        RuledCondition.Rule[] memory empty = new RuledCondition.Rule[](0);
        ruled.updateRules(empty);
        assertEq(ruled.getRules().length, 0);
    }

    function test_updateRules_largeArrayPersists() public {
        // 100 rules — well within the bound the contract can store. Confirms
        // `delete rules; push * N` cycle works under sustained load.
        uint256 N = 100;
        RuledCondition.Rule[] memory rs = new RuledCondition.Rule[](N);
        for (uint256 i = 0; i < N; i++) {
            rs[i] = _rule(VALUE_RULE_ID, OP_RET, uint240(i + 1));
        }
        ruled.updateRules(rs);
        assertEq(ruled.getRules().length, N);
        // Spot-check a few entries.
        assertEq(uint256(ruled.getRules()[0].value), 1);
        assertEq(uint256(ruled.getRules()[N - 1].value), N);
    }

    // -------------------------------------------------------------------------
    // GAP: `_checkCondition` swallows reverts and rejects malformed returndata
    // -------------------------------------------------------------------------

    function test_checkCondition_swallowsRevertFromExternalCondition() public {
        RevertingConditionMock rev = new RevertingConditionMock();
        RuledCondition.Rule[] memory rs = new RuledCondition.Rule[](1);
        rs[0] = _rule(
            CONDITION_RULE_ID,
            OP_EQ,
            _conditionAddr(IPermissionCondition(address(rev)))
        );
        ruled.updateRules(rs);

        // Must not propagate the revert; instead `_checkCondition` returns
        // false → value=0, comparedTo=1, EQ → false.
        assertFalse(_isGrantedEmpty());
    }

    function test_checkCondition_rejectsNon32ByteReturndata() public {
        WeirdReturndataConditionMock weird = new WeirdReturndataConditionMock();
        RuledCondition.Rule[] memory rs = new RuledCondition.Rule[](1);
        rs[0] = _rule(
            CONDITION_RULE_ID,
            OP_EQ,
            _conditionAddr(IPermissionCondition(address(weird)))
        );
        ruled.updateRules(rs);

        // `_checkCondition` checks `returndatasize() == 32`; 64 bytes → return false.
        assertFalse(_isGrantedEmpty());
    }
}
