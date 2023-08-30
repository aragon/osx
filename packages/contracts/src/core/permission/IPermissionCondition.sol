// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

/// @title IPermissionCondition
/// @author Aragon Association - 2021-2023
/// @notice An interface to be implemented to support custom permission logic.
/// @dev To attach a condition to a permission, the `grantWithCondition` function must be used and refer to the implementing contract's address with the `condition` argument.
interface IPermissionCondition {
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
    ) external view returns (bool isPermitted);
}
