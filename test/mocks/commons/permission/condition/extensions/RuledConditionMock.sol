// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;
import {RuledCondition} from "../../../../../../src/common/permission/condition/extensions/RuledCondition.sol";
import {DaoAuthorizableUpgradeable} from "../../../../../../src/common/permission/auth/DaoAuthorizableUpgradeable.sol";

/// @notice A mock powerful condition to expose internal functions
/// @dev DO NOT USE IN PRODUCTION!
contract RuledConditionMock is DaoAuthorizableUpgradeable, RuledCondition {
    function updateRules(Rule[] memory _rules) public virtual {
        _updateRules(_rules);
    }

    function isGranted(
        address _where,
        address _who,
        bytes32 _permissionId,
        bytes calldata data
    ) external view override returns (bool isPermitted) {
        uint256[] memory _compareList = data.length == 0
            ? new uint256[](0)
            : abi.decode(data, (uint256[]));
        return _evalRule(0, _where, _who, _permissionId, _compareList);
    }
}
