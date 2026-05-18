// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {IPermissionCondition} from "../IPermissionCondition.sol";
import {PermissionConditionUpgradeable} from "../PermissionConditionUpgradeable.sol";

/// @title RuledCondition
/// @author Aragon X - 2024
/// @notice An abstract contract to create conditional permissions using rules.
abstract contract RuledCondition is PermissionConditionUpgradeable {
    /// @notice Identifier for a rule based on the current block number.
    uint8 internal constant BLOCK_NUMBER_RULE_ID = 200;

    /// @notice Identifier for a rule based on the current timestamp.
    uint8 internal constant TIMESTAMP_RULE_ID = 201;

    /// @notice Identifier for a rule that evaluates a condition based on another condition contract.
    uint8 internal constant CONDITION_RULE_ID = 202;

    /// @notice Identifier for a rule that is based on logical operations (e.g., AND, OR).
    uint8 internal constant LOGIC_OP_RULE_ID = 203;

    /// @notice Identifier for a rule that involves direct value comparison.
    uint8 internal constant VALUE_RULE_ID = 204;

    /// @notice Emitted when the rules are updated.
    /// @param rules The new rules that replaces old rules.
    event RulesUpdated(Rule[] rules);

    /// @notice Represents a rule used in the condition contract.
    /// @param id The ID representing the identifier of the rule.
    /// @param op The operation to apply, as defined in the `Op` enum.
    /// @param value The value associated with this rule, which could be an address, timestamp, etc.
    /// @param permissionId The specific permission ID to use for evaluating this rule. If set to `0x`, the passed permission ID will be used.
    struct Rule {
        uint8 id;
        uint8 op;
        uint240 value;
        bytes32 permissionId;
    }

    /// @notice Represents various operations that can be performed in a rule.
    /// @param NONE No operation.
    /// @param EQ Equal to operation.
    /// @param NEQ Not equal to operation.
    /// @param GT Greater than operation.
    /// @param LT Less than operation.
    /// @param GTE Greater than or equal to operation.
    /// @param LTE Less than or equal to operation.
    /// @param RET Return the evaluation result.
    /// @param NOT Logical NOT operation.
    /// @param AND Logical AND operation.
    /// @param OR Logical OR operation.
    /// @param XOR Logical XOR operation.
    /// @param IF_ELSE Conditional evaluation with IF-ELSE logic.
    enum Op {
        NONE,
        EQ,
        NEQ,
        GT,
        LT,
        GTE,
        LTE,
        RET,
        NOT,
        AND,
        OR,
        XOR,
        IF_ELSE
    }

    /// @notice A set of rules that will be used in the evaluation process.
    Rule[] private rules;

    /// @inheritdoc PermissionConditionUpgradeable
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == type(RuledCondition).interfaceId ||
            super.supportsInterface(_interfaceId);
    }

    /// @notice Retrieves the current rules stored in this contract.
    /// @return An array of `Rule` structs representing the currently defined rules.
    function getRules() public view virtual returns (Rule[] memory) {
        return rules;
    }

    /// @notice Updates the set of rules.
    /// @dev This function deletes the current set of rules and replaces it with a new one.
    /// @param _rules An new array of `Rule` structs to replace the current set of rules.
    function _updateRules(Rule[] memory _rules) internal virtual {
        delete rules;

        for (uint256 i; i < _rules.length; ) {
            rules.push(_rules[i]);
            unchecked {
                ++i;
            }
        }

        emit RulesUpdated(_rules);
    }

    /// @notice Evaluates a rule by its index.
    /// @param _ruleIndex The index of the rule to evaluate.
    /// @param _where The address of the target contract.
    /// @param _who The address (EOA or contract) for which the permissions are checked.
    /// @param _permissionId The permission identifier.
    /// @param _compareList A list of values used for comparison.
    /// @return Returns `true` if the rule passes.
    function _evalRule(
        uint32 _ruleIndex,
        address _where,
        address _who,
        bytes32 _permissionId,
        uint256[] memory _compareList
    ) internal view virtual returns (bool) {
        Rule memory rule = rules[_ruleIndex];

        if (rule.id == LOGIC_OP_RULE_ID) {
            return _evalLogic(rule, _where, _who, _permissionId, _compareList);
        }

        uint256 value;
        uint256 comparedTo = uint256(rule.value);

        // get value
        if (rule.id == CONDITION_RULE_ID) {
            bytes32 permissionId = rule.permissionId;

            bool conditionRes = _checkCondition(
                IPermissionCondition(address(uint160(rule.value))),
                _where,
                _who,
                permissionId == bytes32(0) ? _permissionId : permissionId,
                _compareList
            );
            value = conditionRes ? 1 : 0;
            comparedTo = 1;
        } else if (rule.id == BLOCK_NUMBER_RULE_ID) {
            value = block.number;
        } else if (rule.id == TIMESTAMP_RULE_ID) {
            value = block.timestamp;
        } else if (rule.id == VALUE_RULE_ID) {
            value = uint256(rule.value);
        } else {
            if (rule.id >= _compareList.length) {
                return false;
            }
            value = uint256(uint240(_compareList[rule.id])); // force lost precision
        }

        if (Op(rule.op) == Op.RET) {
            return uint256(value) > 0;
        }

        return _compare(value, comparedTo, Op(rule.op));
    }

    /// @notice Evaluates logical operations.
    /// @param _rule The rule containing the logical operation.
    /// @param _where The address of the target contract.
    /// @param _who The address (EOA or contract) for which the permissions are checked.
    /// @param _permissionId The permission identifier.
    /// @param _compareList A list of values used for comparison in evaluation.
    /// @return Returns `true` if the logic evaluates to true.
    function _evalLogic(
        Rule memory _rule,
        address _where,
        address _who,
        bytes32 _permissionId,
        uint256[] memory _compareList
    ) internal view virtual returns (bool) {
        if (Op(_rule.op) == Op.IF_ELSE) {
            (
                uint32 currentRuleIndex,
                uint32 ruleIndexOnSuccess,
                uint32 ruleIndexOnFailure
            ) = decodeRuleValue(uint256(_rule.value));
            bool result = _evalRule(currentRuleIndex, _who, _where, _permissionId, _compareList);

            return
                _evalRule(
                    result ? ruleIndexOnSuccess : ruleIndexOnFailure,
                    _where,
                    _who,
                    _permissionId,
                    _compareList
                );
        }

        uint32 param1;
        uint32 param2;

        (param1, param2, ) = decodeRuleValue(uint256(_rule.value));
        bool r1 = _evalRule(param1, _where, _who, _permissionId, _compareList);

        if (Op(_rule.op) == Op.NOT) {
            return !r1;
        }

        if (r1 && Op(_rule.op) == Op.OR) {
            return true;
        }

        if (!r1 && Op(_rule.op) == Op.AND) {
            return false;
        }

        bool r2 = _evalRule(param2, _where, _who, _permissionId, _compareList);

        if (Op(_rule.op) == Op.XOR) {
            return r1 != r2;
        }

        return r2; // both or and and depend on result of r2 after checks
    }

    /// @notice Checks an external condition.
    /// @param _condition The address of the external condition.
    /// @param _where The address of the target contract.
    /// @param _who The address (EOA or contract) for which the permissions are checked.
    /// @param _permissionId The permission identifier.
    /// @param _compareList A list of values used for comparison in evaluation.
    /// @return Returns `true` if the external condition is granted.
    function _checkCondition(
        IPermissionCondition _condition,
        address _where,
        address _who,
        bytes32 _permissionId,
        uint256[] memory _compareList
    ) internal view virtual returns (bool) {
        // a raw call is required so we can return false if the call reverts, rather than reverting
        bytes memory checkCalldata = abi.encodeWithSelector(
            _condition.isGranted.selector,
            _where,
            _who,
            _permissionId,
            abi.encode(_compareList)
        );

        bool ok;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            // send all available gas; if the oracle eats up all the gas, we will eventually revert
            // note that we are currently guaranteed to still have some gas after the call from
            // EIP-150's 63/64 gas forward rule
            ok := staticcall(
                gas(),
                _condition,
                add(checkCalldata, 0x20),
                mload(checkCalldata),
                0,
                0
            )
        }

        if (!ok) {
            return false;
        }

        uint256 size;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            size := returndatasize()
        }
        if (size != 32) {
            return false;
        }

        bool result;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let ptr := mload(0x40) // get next free memory ptr
            returndatacopy(ptr, 0, size) // copy return from above `staticcall`
            result := mload(ptr) // read data at ptr and set it to result
            mstore(ptr, 0) // set pointer memory to 0 so it still is the next free ptr
        }

        return result;
    }

    /// @notice Compares two values based on the specified operation.
    /// @param _a The first value to compare.
    /// @param _b The second value to compare.
    /// @param _op The operation to use for comparison.
    /// @return Returns `true` if the comparison holds true.
    function _compare(uint256 _a, uint256 _b, Op _op) internal pure returns (bool) {
        if (_op == Op.EQ) return _a == _b;
        if (_op == Op.NEQ) return _a != _b;
        if (_op == Op.GT) return _a > _b;
        if (_op == Op.LT) return _a < _b;
        if (_op == Op.GTE) return _a >= _b;
        if (_op == Op.LTE) return _a <= _b;
        return false;
    }

    /// @notice Encodes rule indices into a uint240 value.
    /// @param startingRuleIndex The index of the starting rule to evaluate.
    /// @param successRuleIndex The index of the rule to evaluate if the evaluation of `startingRuleIndex` was true.
    /// @param failureRuleIndex The index of the rule to evaluate if the evaluation of `startingRuleIndex` was false.
    /// @return The encoded value combining all three inputs.
    function encodeIfElse(
        uint256 startingRuleIndex,
        uint256 successRuleIndex,
        uint256 failureRuleIndex
    ) public pure returns (uint240) {
        return uint240(startingRuleIndex + (successRuleIndex << 32) + (failureRuleIndex << 64));
    }

    /// @notice Encodes two rule indexes into a uint240 value. Useful for logical operators such as `AND/OR/XOR` and others.
    /// @param ruleIndex1 The first index to evaluate.
    /// @param ruleIndex2 The second index to evaluate.
    function encodeLogicalOperator(
        uint256 ruleIndex1,
        uint256 ruleIndex2
    ) public pure returns (uint240) {
        return uint240(ruleIndex1 + (ruleIndex2 << 32));
    }

    /// @notice Decodes rule indices into three uint32.
    /// @param _x The value to decode.
    /// @return a The first 32-bit segment.
    /// @return b The second 32-bit segment.
    /// @return c The third 32-bit segment.
    function decodeRuleValue(uint256 _x) public pure returns (uint32 a, uint32 b, uint32 c) {
        a = uint32(_x);
        b = uint32(_x >> (8 * 4));
        c = uint32(_x >> (8 * 8));
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZeppelin's guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[49] private __gap;
}
