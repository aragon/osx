// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

/// @title IPermissionCondition
/// @author Aragon X - 2021-2023
/// @notice An interface to be implemented to support custom permission logic.
/// @dev To attach a condition to a permission, the `grantWithCondition` function must be used and refer to the implementing contract's address with the `condition` argument.
/// @custom:security-contact sirt@aragon.org
contract SelectorRoleModifierCondition {
    DAO public dao;

    constructor(address _dao) {
        dao = DAO(_dao);
    }

    // THE PROBLEM: Assume pluginA and pluginB both have EXECUTE_PERMISSION without a condition. So they both can call dao with whatever actions.
    // Now, we want only pluginA(not pluginB) to be able to call pluginC:
    // 1. grant pluginB EXECUTE_PERMISSION with this condition.
    // 2. register the pluginC permission.
    // 3. pluginA still has EXECUTE_PERMISSION with no condition, so it can still call pluginC, but pluginB's call comes into the condition and
    // doesn't allow it.

    /// @notice Checks if a call is permitted.
    /// @param _where The address of the target contract.
    /// @param _who The address (EOA or contract) for which the permissions are checked.
    /// @param _permissionId The permission identifier.
    /// @param _data Optional data passed to the `PermissionCondition` implementation.
    /// @return isPermitted Returns true if the call is permitted.
    function isGranted(
        address _where,
        address _who,
        bytes32 _permissionId,
        bytes calldata _data
    ) external view returns (bool isPermitted) {
        (, IDAO.Action[] memory actions, ) = abi.decode(data, (bytes32, IDAO.Action[], uint256));

        address[] memory targets = new address[](actions.length);
        bytes4[] memory selectors = new bytes4[](actions.length);

        for (uint i = 0; i < actions.length; i++) {
            targets[i] = actions[i].to;
            selectors = bytes4(actions[i].data[0:4]);
        }

        return dao.isFunctionCallsAllowed(_who, targets, selectors);
    }
}
