// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

/// @title IPermissionCondition
/// @author Aragon Association - 2021-2023
/// @notice This interface can be implemented to support more customary permissions depending on on- or off-chain state, e.g., by querying token ownershop or a secondary condition, respectively.
interface IPermissionCondition {
    /// @notice This method is used to check if a call is permitted.
    /// @param _where The address of the target contract.
    /// @param _who The address (EOA or contract) for which the permission are checked.
    /// @param _permissionId The permission identifier.
    /// @param _data Optional data passed to the `PermissionCondition` implementation.
    /// @return allowed Returns true if the call is permitted.
    function isGranted(
        address _where,
        address _who,
        bytes32 _permissionId,
        bytes calldata _data
    ) external view returns (bool allowed);
}
