// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IVotesUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/utils/IVotesUpgradeable.sol";

import {MajorityVotingBase} from "../majority/MajorityVotingBase.sol";
import {IDAO} from "../../core/IDAO.sol";
import {IMajorityVoting} from "../majority/IMajorityVoting.sol";

/// @title TokenVoting
/// @author Aragon Association - 2021-2022
/// @notice The majority voting implementation using an [OpenZepplin `Votes`](https://docs.openzeppelin.com/contracts/4.x/api/governance#Votes) compatible governance token.
/// @dev This contract inherits from `MajorityVotingBase` and implements the `IMajorityVoting` interface.
contract TokenVoting is MajorityVotingBase {
    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 internal constant TOKEN_VOTING_INTERFACE_ID =
        this.getVotingToken.selector ^ this.initialize.selector;

    /// @notice An [OpenZepplin `Votes`](https://docs.openzeppelin.com/contracts/4.x/api/governance#Votes) compatible contract referencing the token being used for voting.
    IVotesUpgradeable private votingToken;

    /// @notice Thrown if the voting power is zero
    error NoVotingPower();

    /// @notice Initializes the component.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The IDAO interface of the associated DAO.
    /// @param _pluginSettings The vote settings.
    /// @param _token The [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token used for voting.
    function initialize(
        IDAO _dao,
        PluginSettings calldata _pluginSettings,
        IVotesUpgradeable _token
    ) public initializer {
        __MajorityVotingBase_init(_dao, _pluginSettings);

        votingToken = _token;
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interace.
    /// @return bool Returns true if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return _interfaceId == TOKEN_VOTING_INTERFACE_ID || super.supportsInterface(_interfaceId);
    }

    /// @notice getter function for the voting token.
    /// @dev public function also useful for registering interfaceId and for distinguishing from majority voting interface.
    /// @return IVotesUpgradeable the token used for voting.
    function getVotingToken() public view returns (IVotesUpgradeable) {
        return votingToken;
    }

    /// @inheritdoc IMajorityVoting
    function createProposal(
        bytes calldata _proposalMetadata,
        IDAO.Action[] calldata _actions,
        uint64 _startDate,
        uint64 _endDate,
        bool _tryEarlyExecution,
        VoteOption _choice
    ) external override returns (uint256 proposalId) {
        uint64 snapshotBlock = getBlockNumber64() - 1;

        uint256 totalVotingPower = votingToken.getPastTotalSupply(snapshotBlock);
        if (totalVotingPower == 0) revert NoVotingPower();

        if (votingToken.getPastVotes(_msgSender(), snapshotBlock) < minProposerVotingPower()) {
            revert ProposalCreationForbidden(_msgSender());
        }

        proposalId = proposalCount++;

        // Create the proposal
        Proposal storage proposal_ = proposals[proposalId];

        (
            proposal_.proposalVoteConfiguration.startDate,
            proposal_.proposalVoteConfiguration.endDate
        ) = _validateVoteDates(_startDate, _endDate);
        proposal_.proposalVoteConfiguration.snapshotBlock = snapshotBlock;
        proposal_.proposalVoteConfiguration.earlyExecution = earlyExecution();
        proposal_.proposalVoteConfiguration.voteReplacement = voteReplacement();
        proposal_.proposalVoteConfiguration.supportThreshold = supportThreshold();
        proposal_.proposalVoteConfiguration.minParticipation = minParticipation();

        proposal_.tally.totalVotingPower = totalVotingPower;

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

        vote(proposalId, _choice, _tryEarlyExecution);
    }

    /// @inheritdoc MajorityVotingBase
    function _vote(
        uint256 _proposalId,
        VoteOption _choice,
        address _voter,
        bool _tryEarlyExecution
    ) internal override {
        Proposal storage proposal_ = proposals[_proposalId];

        // This could re-enter, though we can assume the governance token is not malicious
        uint256 votingPower = votingToken.getPastVotes(
            _voter,
            proposal_.proposalVoteConfiguration.snapshotBlock
        );
        VoteOption state = proposal_.voters[_voter];

        // If voter had previously voted, decrease count
        if (state == VoteOption.Yes) {
            proposal_.tally.yes = proposal_.tally.yes - votingPower;
        } else if (state == VoteOption.No) {
            proposal_.tally.no = proposal_.tally.no - votingPower;
        } else if (state == VoteOption.Abstain) {
            proposal_.tally.abstain = proposal_.tally.abstain - votingPower;
        }

        // write the updated/new vote for the voter.
        if (_choice == VoteOption.Yes) {
            proposal_.tally.yes = proposal_.tally.yes + votingPower;
        } else if (_choice == VoteOption.No) {
            proposal_.tally.no = proposal_.tally.no + votingPower;
        } else if (_choice == VoteOption.Abstain) {
            proposal_.tally.abstain = proposal_.tally.abstain + votingPower;
        }

        proposal_.voters[_voter] = _choice;

        emit VoteCast({
            proposalId: _proposalId,
            voter: _voter,
            choice: uint8(_choice),
            votingPower: votingPower
        });

        if (_tryEarlyExecution && _canExecute(_proposalId)) {
            _execute(_proposalId);
        }
    }

    /// @inheritdoc MajorityVotingBase
    function _canVote(uint256 _proposalId, address _voter) internal view override returns (bool) {
        Proposal storage proposal_ = proposals[_proposalId];

        if (
            !proposal_.proposalVoteConfiguration.voteReplacement &&
            proposal_.voters[_voter] != VoteOption.None
        ) {
            revert VoteReplacementNotAllowed();
        }

        return
            _isVoteOpen(proposal_) &&
            votingToken.getPastVotes(_voter, proposal_.proposalVoteConfiguration.snapshotBlock) > 0;
    }

    /// @dev This empty reserved space is put in place to allow future versions to add new
    /// variables without shifting down storage in the inheritance chain.
    /// https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    uint256[49] private __gap;
}
