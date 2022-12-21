// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {CheckpointsUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CheckpointsUpgradeable.sol";
import {PluginUUPSUpgradeable} from "../../core/plugin/PluginUUPSUpgradeable.sol";

import {_uncheckedAdd, _uncheckedSub} from "../../utils/UncheckedMath.sol";
import {TimeHelpers} from "../../utils/TimeHelpers.sol";

/// @title Addresslist
/// @author Aragon Association - 2021-2022.
/// @notice The majority voting implementation using an list of member addresses.
/// @dev This contract inherits from `MajorityVotingBase` and implements the `IMajorityVoting` interface.
abstract contract Addresslist is TimeHelpers {
    using CheckpointsUpgradeable for CheckpointsUpgradeable.History;

    /// @notice The mapping containing the checkpointed history of the address list.
    mapping(address => CheckpointsUpgradeable.History) private _addresslistCheckpoints;

    /// @notice The checkpointed history of the length of the address list.
    CheckpointsUpgradeable.History private _addresslistLengthCheckpoints;

    /// @notice Emitted when new members are added to the address list.
    /// @param members The array of member addresses to be added.
    event AddressesAdded(address[] members);

    /// @notice Emitted when members are removed from the address list.
    /// @param members The array of member addresses to be removed.
    event AddressesRemoved(address[] members);

    /// @notice Checks if an account is on the address list at given block number.
    /// @param _account The account address being checked.
    /// @param _blockNumber The block number.
    function isListed(address _account, uint256 _blockNumber) public view returns (bool) {
        if (_blockNumber == 0) _blockNumber = getBlockNumber64() - 1;

        return _addresslistCheckpoints[_account].getAtBlock(_blockNumber) == 1;
    }

    /// @notice Returns the length of the address list at a specific block number.
    /// @param _blockNumber The specific block to get the count from. If `0`, then the latest checkpoint value is returned.
    /// @return The address list length at the specified block number.
    function addresslistLengthAtBlock(uint256 _blockNumber) public view returns (uint256) {
        return _addresslistLengthCheckpoints.getAtBlock(_blockNumber);
    }

    /// @notice Returns the current length of the address list.
    /// @return The address list length at the specified block number.
    function addresslistLength() public view returns (uint256) {
        return _addresslistLengthCheckpoints.latest();
    }

    /// @notice Updates the address list by adding or removing members.
    /// @param _members The member addresses to be updated.
    /// @param _enabled Whether to add or remove members from the address list.
    function _updateAddresslist(address[] calldata _members, bool _enabled) internal {
        _addresslistLengthCheckpoints.push(
            _enabled ? _uncheckedAdd : _uncheckedSub,
            _members.length
        );

        for (uint256 i = 0; i < _members.length; ) {
            _addresslistCheckpoints[_members[i]].push(_enabled ? 1 : 0);

            unchecked {
                ++i;
            }
        }
    }

    /// @dev This empty reserved space is put in place to allow future versions to add new
    /// variables without shifting down storage in the inheritance chain.
    /// https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    uint256[48] private __gap;
}
