// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {PermissionConditionUpgradeable} from "../../../../../src/common/permission/condition/PermissionConditionUpgradeable.sol";

/// @notice A mock permission condition that can be set to permit or deny every call and be upgraded by everyone.
/// @dev DO NOT USE IN PRODUCTION!
contract PermissionConditionUpgradeableMock is PermissionConditionUpgradeable {
    bool public answer;

    function setAnswer(bool _answer) external {
        answer = _answer;
    }

    function isGranted(
        address _where,
        address _who,
        bytes32 _permissionId,
        bytes memory _data
    ) external view returns (bool) {
        (_where, _who, _permissionId, _data);
        return answer;
    }
}
