// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Checkpoints} from "@openzeppelin/contracts/utils/Checkpoints.sol";
import {PluginUUPSUpgradeable} from "../../core/plugin/PluginUUPSUpgradeable.sol";

import {_uncheckedAdd, _uncheckedSub} from "../../utils/UncheckedMath.sol";
import {MajorityVotingBase} from "../majority/MajorityVotingBase.sol";
import {IDAO} from "../../core/IDAO.sol";
import {IMajorityVoting} from "../majority/IMajorityVoting.sol";

/// @title AddresslistVoting
/// @author Aragon Association - 2021-2022.
/// @notice The majority voting implementation using an list of member addresses.
/// @dev This contract inherits from `MajorityVotingBase` and implements the `IMajorityVoting` interface.
contract AddresslistVoting is MajorityVotingBase {
    using Checkpoints for Checkpoints.History;

    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 internal constant ADDRESSLIST_VOTING_INTERFACE_ID =
        this.addAddresses.selector ^
            this.removeAddresses.selector ^
            this.isListed.selector ^
            this.addresslistLength.selector;

    /// @notice The ID of the permission required to call the `addAddresses` and `removeAddresses` functions.
    bytes32 public constant MODIFY_ADDRESSLIST_PERMISSION_ID =
        keccak256("MODIFY_ADDRESSLIST_PERMISSION");

    /// @notice The mapping containing the checkpointed history of the address list.
    mapping(address => Checkpoints.History) private _addresslistCheckpoints;

    /// @notice The checkpointed history of the length of the address list.
    Checkpoints.History private _addresslistLengthCheckpoints;

    /// @notice Thrown when a sender is not allowed to create a vote.
    /// @param sender The sender address.
    error ProposalCreationForbidden(address sender);

    /// @notice Emitted when new members are added to the address list.
    /// @param members The array of member addresses to be added.
    event AddressesAdded(address[] members);

    /// @notice Emitted when members are removed from the address list.
    /// @param members The array of member addresses to be removed.
    event AddressesRemoved(address[] members);

    /// @notice Initializes the component.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The IDAO interface of the associated DAO.
    /// @param _totalSupportThresholdPct The total support threshold in percent.
    /// @param _relativeSupportThresholdPct The relative support threshold in percent.
    /// @param _minDuration The minimal duration of a vote.
    /// @param _members The initial member addresses to be listed.
    function initialize(
        IDAO _dao,
        uint64 _totalSupportThresholdPct,
        uint64 _relativeSupportThresholdPct,
        uint64 _minDuration,
        address[] calldata _members
    ) public initializer {
        __MajorityVotingBase_init(
            _dao,
            _totalSupportThresholdPct,
            _relativeSupportThresholdPct,
            _minDuration
        );

        // add member addresses to the address list
        _addAddresses(_members);
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interace.
    /// @return bool Returns true if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == ADDRESSLIST_VOTING_INTERFACE_ID ||
            super.supportsInterface(_interfaceId);
    }

    /// @notice Adds new members to the address list.
    /// @param _members The addresses of the members to be added.
    function addAddresses(address[] calldata _members)
        external
        auth(MODIFY_ADDRESSLIST_PERMISSION_ID)
    {
        _addAddresses(_members);
    }

    /// @notice Internal function to add new members to the address list.
    /// @param _members The addresses of members to be added.
    /// @dev This functin is used during the plugin initialization.
    function _addAddresses(address[] calldata _members) internal {
        _updateAddresslist(_members, true);

        emit AddressesAdded(_members);
    }

    /// @notice Removes members from the address list.
    /// @param _members The addresses of the members to be removed.
    function removeAddresses(address[] calldata _members)
        external
        auth(MODIFY_ADDRESSLIST_PERMISSION_ID)
    {
        _updateAddresslist(_members, false);

        emit AddressesRemoved(_members);
    }

    /// @inheritdoc IMajorityVoting
    function createProposal(
        bytes calldata _proposalMetadata,
        IDAO.Action[] calldata _actions,
        uint64 _startDate,
        uint64 _endDate,
        bool _executeIfDecided,
        VoteOption _choice
    ) external override returns (uint256 proposalId) {
        uint64 snapshotBlock = getBlockNumber64() - 1;

        if (!isListed(_msgSender(), snapshotBlock)) {
            revert ProposalCreationForbidden(_msgSender());
        }

        // calculate start and end time for the vote
        uint64 currentTimestamp = getTimestamp64();

        if (_startDate == 0) _startDate = currentTimestamp;
        if (_endDate == 0) _endDate = _startDate + minDuration;

        if (_endDate - _startDate < minDuration || _startDate < currentTimestamp)
            revert VotingPeriodInvalid({
                current: currentTimestamp,
                start: _startDate,
                end: _endDate,
                minDuration: minDuration
            });

        proposalId = proposalCount++;

        // create a vote.
        Proposal storage proposal_ = proposals[proposalId];
        proposal_.startDate = _startDate;
        proposal_.endDate = _endDate;
        proposal_.snapshotBlock = snapshotBlock;
        proposal_.relativeSupportThresholdPct = relativeSupportThresholdPct;
        proposal_.totalSupportThresholdPct = totalSupportThresholdPct;
        proposal_.totalVotingPower = addresslistLength(snapshotBlock);

        unchecked {
            for (uint256 i = 0; i < _actions.length; i++) {
                proposal_.actions.push(_actions[i]);
            }
        }

        emit ProposalCreated(proposalId, _msgSender(), _proposalMetadata);

        vote(proposalId, _choice, _executeIfDecided);
    }

    /// @inheritdoc MajorityVotingBase
    function _vote(
        uint256 _proposalId,
        VoteOption _choice,
        address _voter,
        bool _executesIfDecided
    ) internal override {
        Proposal storage proposal_ = proposals[_proposalId];

        VoteOption state = proposal_.voters[_voter];

        // Remove the previous vote.
        if (state == VoteOption.Yes) {
            proposal_.yes = proposal_.yes - 1;
        } else if (state == VoteOption.No) {
            proposal_.no = proposal_.no - 1;
        } else if (state == VoteOption.Abstain) {
            proposal_.abstain = proposal_.abstain - 1;
        }

        // Store the updated/new vote for the voter.
        if (_choice == VoteOption.Yes) {
            proposal_.yes = proposal_.yes + 1;
        } else if (_choice == VoteOption.No) {
            proposal_.no = proposal_.no + 1;
        } else if (_choice == VoteOption.Abstain) {
            proposal_.abstain = proposal_.abstain + 1;
        }

        proposal_.voters[_voter] = _choice;

        emit VoteCast(_proposalId, _voter, uint8(_choice), 1);

        if (_executesIfDecided && _canExecute(_proposalId)) {
            _execute(_proposalId);
        }
    }

    /// @notice Checks if an account is on the address list at given block number.
    /// @param _account The account address being checked.
    /// @param _blockNumber The block number.
    function isListed(address _account, uint256 _blockNumber) public view returns (bool) {
        if (_blockNumber == 0) _blockNumber = getBlockNumber64() - 1;

        return _addresslistCheckpoints[_account].getAtBlock(_blockNumber) == 1;
    }

    /// @notice Returns the length of the address list at a specific block number.
    /// @param _blockNumber The specific block to get the count from.
    /// @return The address list length at the specified block number.
    function addresslistLength(uint256 _blockNumber) public view returns (uint256) {
        if (_blockNumber == 0) {
            _blockNumber = getBlockNumber64() - 1;
        }
        return _addresslistLengthCheckpoints.getAtBlock(_blockNumber);
    }

    /// @inheritdoc MajorityVotingBase
    function _canVote(uint256 _proposalId, address _voter) internal view override returns (bool) {
        Proposal storage proposal_ = proposals[_proposalId];
        return _isVoteOpen(proposal_) && isListed(_voter, proposal_.snapshotBlock);
    }

    /// @notice Updates the address list by adding or removing members.
    /// @param _members The member addresses to be updated.
    /// @param _enabled Whether to add or remove members from the address list.
    function _updateAddresslist(address[] calldata _members, bool _enabled) internal {
        _addresslistLengthCheckpoints.push(
            _enabled ? _uncheckedAdd : _uncheckedSub,
            _members.length
        );

        for (uint256 i = 0; i < _members.length; i++) {
            _addresslistCheckpoints[_members[i]].push(_enabled ? 1 : 0);
        }
    }

    /// @dev This empty reserved space is put in place to allow future versions to add new
    /// variables without shifting down storage in the inheritance chain.
    /// https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    uint256[48] private __gap;
}
