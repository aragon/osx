// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {CheckpointsUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CheckpointsUpgradeable.sol";

import {_uncheckedAdd, _uncheckedSub} from "../../utils/UncheckedMath.sol";

/// @title Addresslist
/// @author Aragon Association - 2021-2023
/// @notice The majority voting implementation using an list of member addresses.
/// @dev This contract inherits from `MajorityVotingBase` and implements the `IMajorityVoting` interface.
abstract contract Addresslist {
    using CheckpointsUpgradeable for CheckpointsUpgradeable.History;

    /// @notice The mapping containing the checkpointed history of the address list.
    mapping(address => CheckpointsUpgradeable.History) private _addresslistCheckpoints;

    /// @notice The checkpointed history of the length of the address list.
    CheckpointsUpgradeable.History private _addresslistLengthCheckpoints;

    /// @notice Thrown when the address list update is invalid, which can be caused by the addition of an existing member or removal of a non-existing member.
    /// @param member The array of member addresses to be added or removed.
    error InvalidAddresslistUpdate(address member);

    /// @notice Checks if an account is on the address list at a specific block number.
    /// @param _account The account address being checked.
    /// @param _blockNumber The block number.
    /// @return Whether the account is listed at the specified block number.
    function isListedAtBlock(
        address _account,
        uint256 _blockNumber
    ) public view virtual returns (bool) {
        return _addresslistCheckpoints[_account].getAtBlock(_blockNumber) == 1;
    }

    /// @notice Checks if an account is currently on the address list.
    /// @param _account The account address being checked.
    /// @return Whether the account is currently listed.
    function isListed(address _account) public view virtual returns (bool) {
        return _addresslistCheckpoints[_account].latest() == 1;
    }

    /// @notice Returns the length of the address list at a specific block number.
    /// @param _blockNumber The specific block to get the count from. If `0`, then the latest checkpoint value is returned.
    /// @return The address list length at the specified block number.
    function addresslistLengthAtBlock(uint256 _blockNumber) public view virtual returns (uint256) {
        return _addresslistLengthCheckpoints.getAtBlock(_blockNumber);
    }

    /// @notice Returns the current length of the address list.
    /// @return The current address list length.
    function addresslistLength() public view virtual returns (uint256) {
        return _addresslistLengthCheckpoints.latest();
    }

    /// @notice Internal function to add new addresses to the address list.
    /// @param _newAddresses The new addresses to be added.
    function _addAddresses(address[] calldata _newAddresses) internal virtual {
        for (uint256 i; i < _newAddresses.length; ) {
            if (isListed(_newAddresses[i])) {
                revert InvalidAddresslistUpdate(_newAddresses[i]);
            }

            // Mark the address as listed
            _addresslistCheckpoints[_newAddresses[i]].push(1);

            unchecked {
                ++i;
            }
        }
        _addresslistLengthCheckpoints.push(_uncheckedAdd, _newAddresses.length);
    }

    /// @notice Internal function to remove existing addresses from the address list.
    /// @param _exitingAddresses The existing addresses to be removed.
    function _removeAddresses(address[] calldata _exitingAddresses) internal virtual {
        for (uint256 i; i < _exitingAddresses.length; ) {
            if (!isListed(_exitingAddresses[i])) {
                revert InvalidAddresslistUpdate(_exitingAddresses[i]);
            }

            // Mark the address as not listed
            _addresslistCheckpoints[_exitingAddresses[i]].push(0);

            unchecked {
                ++i;
            }
        }
        _addresslistLengthCheckpoints.push(_uncheckedSub, _exitingAddresses.length);
    }

    /// @dev This empty reserved space is put in place to allow future versions to add new
    /// variables without shifting down storage in the inheritance chain.
    /// https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    uint256[48] private __gap;
}
