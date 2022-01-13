/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

/// @title The IACLOracle to have dynamic permissions
/// @author Aragon Association - 2021
/// @notice This contract used to have dynamic permissions as for example that only users with a token X can do Y.
interface IACLOracle {
    // @dev This method is used to check if a callee has the permissions for.
    // @param _where The address of the contract
    // @param _who The address of a EOA or contract to give the permissions
    // @param _role The hash of the role identifier
    // @param _data The optional data passed to the ACLOracle registered.
    // @return bool
    function willPerform(address _where, address _who, bytes32 _role, bytes calldata _data) external returns (bool allowed);
}
