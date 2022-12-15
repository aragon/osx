// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {CheckpointsUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CheckpointsUpgradeable.sol";
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
    using CheckpointsUpgradeable for CheckpointsUpgradeable.History;

    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 internal constant ADDRESSLIST_VOTING_INTERFACE_ID =
        this.addAddresses.selector ^
            this.removeAddresses.selector ^
            this.isListed.selector ^
            this.addresslistLength.selector ^
            this.initialize.selector;

    /// @notice The ID of the permission required to call the `addAddresses` and `removeAddresses` functions.
    bytes32 public constant MODIFY_ADDRESSLIST_PERMISSION_ID =
        keccak256("MODIFY_ADDRESSLIST_PERMISSION");

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

    /// @notice Initializes the component.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The IDAO interface of the associated DAO.
    /// @param _majorityVotingSettings The majority voting settings.
    function initialize(
        IDAO _dao,
        MajorityVotingSettings calldata _majorityVotingSettings,
        address[] calldata _members
    ) public initializer {
        __MajorityVotingBase_init(_dao, _majorityVotingSettings);

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

        emit AddressesAdded({members: _members});
    }

    /// @notice Removes members from the address list.
    /// @param _members The addresses of the members to be removed.
    function removeAddresses(address[] calldata _members)
        external
        auth(MODIFY_ADDRESSLIST_PERMISSION_ID)
    {
        _updateAddresslist(_members, false);

        emit AddressesRemoved({members: _members});
    }

    /// @inheritdoc IMajorityVoting
    function createProposal(
        bytes calldata _proposalMetadata,
        IDAO.Action[] calldata _actions,
        uint64 _startDate,
        uint64 _endDate,
        bool _tryEarlyExecution,
        VoteOption _voteOption
    ) external override returns (uint256 proposalId) {
        uint64 snapshotBlock = getBlockNumber64() - 1;

        if (minProposerVotingPower() != 0 && !isListed(_msgSender(), snapshotBlock)) {
            revert ProposalCreationForbidden(_msgSender());
        }

        proposalId = proposalCount++;

        // Create the proposal
        Proposal storage proposal_ = proposals[proposalId];

        (
            proposal_.configuration.startDate,
            proposal_.configuration.endDate
        ) = _validateProposalDates(_startDate, _endDate);
        proposal_.configuration.snapshotBlock = snapshotBlock;
        proposal_.configuration.voteMode = voteMode();
        proposal_.configuration.supportThreshold = supportThreshold();
        proposal_.configuration.minParticipation = minParticipation();

        proposal_.tally.totalVotingPower = addresslistLength(snapshotBlock);

        unchecked {
            for (uint256 i = 0; i < _actions.length; i++) {
                proposal_.actions.push(_actions[i]);
            }
        }

        emit ProposalCreated({
            proposalId: proposalId,
            creator: _msgSender(),
            metadata: _proposalMetadata
        });

        vote(proposalId, _voteOption, _tryEarlyExecution);
    }

    /// @inheritdoc MajorityVotingBase
    function _vote(
        uint256 _proposalId,
        VoteOption _voteOption,
        address _voter,
        bool _tryEarlyExecution
    ) internal override {
        Proposal storage proposal_ = proposals[_proposalId];

        VoteOption state = proposal_.voters[_voter];

        // Remove the previous vote.
        if (state == VoteOption.Yes) {
            proposal_.tally.yes = proposal_.tally.yes - 1;
        } else if (state == VoteOption.No) {
            proposal_.tally.no = proposal_.tally.no - 1;
        } else if (state == VoteOption.Abstain) {
            proposal_.tally.abstain = proposal_.tally.abstain - 1;
        }

        // Store the updated/new vote for the voter.
        if (_voteOption == VoteOption.Yes) {
            proposal_.tally.yes = proposal_.tally.yes + 1;
        } else if (_voteOption == VoteOption.No) {
            proposal_.tally.no = proposal_.tally.no + 1;
        } else if (_voteOption == VoteOption.Abstain) {
            proposal_.tally.abstain = proposal_.tally.abstain + 1;
        }

        proposal_.voters[_voter] = _voteOption;

        emit VoteCast({
            proposalId: _proposalId,
            voter: _voter,
            voteOption: _voteOption,
            votingPower: 1
        });

        if (_tryEarlyExecution && _canExecute(_proposalId)) {
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

        return
            _isVoteOpen(proposal_) &&
            // Check if voter has voting power.
            isListed(_voter, proposal_.configuration.snapshotBlock) &&
            // Check if the vote is a disallowed vote replacement.
            !(proposal_.configuration.voteMode != VoteMode.VoteReplacement &&
                proposal_.voters[_voter] != VoteOption.None);
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
