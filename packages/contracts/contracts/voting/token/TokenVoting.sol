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
    /// @param _supportThreshold The support threshold in percent.
    /// @param _minParticipation The minimal participation in percent.
    /// @param _minDuration The minimal duration of a vote.
    /// @param _token The [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token used for voting.
    function initialize(
        IDAO _dao,
        uint64 _supportThreshold,
        uint64 _minParticipation,
        uint64 _minDuration,
        IVotesUpgradeable _token
    ) public initializer {
        __MajorityVotingBase_init(_dao, _supportThreshold, _minParticipation, _minDuration);

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
        bool _executeIfDecided,
        VoteOption _choice
    ) external override returns (uint256 proposalId) {
        uint64 snapshotBlock = getBlockNumber64() - 1;

        uint256 totalVotingPower = votingToken.getPastTotalSupply(snapshotBlock);
        if (totalVotingPower == 0) revert NoVotingPower();

        proposalId = proposalCount++;

        // Calculate the start and end time of the vote
        uint64 currentTimestamp = getTimestamp64();

        if (_startDate == 0) {
            _startDate = currentTimestamp;
        }
        if (_endDate == 0) {
            _endDate = _startDate + minDuration;
        }

        if (_endDate - _startDate < minDuration || _startDate < currentTimestamp) {
            revert VotingPeriodInvalid({
                current: currentTimestamp,
                start: _startDate,
                end: _endDate,
                minDuration: minDuration
            });
        }

        // Create the proposal
        Proposal storage proposal_ = proposals[proposalId];
        proposal_.startDate = _startDate;
        proposal_.endDate = _endDate;
        proposal_.supportThreshold = supportThreshold;
        proposal_.minParticipation = minParticipation;
        proposal_.totalVotingPower = totalVotingPower;
        proposal_.snapshotBlock = snapshotBlock;

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

        // This could re-enter, though we can assume the governance token is not malicious
        uint256 votingPower = votingToken.getPastVotes(_voter, proposal_.snapshotBlock);
        VoteOption state = proposal_.voters[_voter];

        // If voter had previously voted, decrease count
        if (state == VoteOption.Yes) {
            proposal_.yes = proposal_.yes - votingPower;
        } else if (state == VoteOption.No) {
            proposal_.no = proposal_.no - votingPower;
        } else if (state == VoteOption.Abstain) {
            proposal_.abstain = proposal_.abstain - votingPower;
        }

        // write the updated/new vote for the voter.
        if (_choice == VoteOption.Yes) {
            proposal_.yes = proposal_.yes + votingPower;
        } else if (_choice == VoteOption.No) {
            proposal_.no = proposal_.no + votingPower;
        } else if (_choice == VoteOption.Abstain) {
            proposal_.abstain = proposal_.abstain + votingPower;
        }

        proposal_.voters[_voter] = _choice;

        emit VoteCast(_proposalId, _voter, uint8(_choice), votingPower);

        if (_executesIfDecided && _canExecute(_proposalId)) {
            _execute(_proposalId);
        }
    }

    /// @inheritdoc MajorityVotingBase
    function _canVote(uint256 _proposalId, address _voter) internal view override returns (bool) {
        Proposal storage proposal_ = proposals[_proposalId];
        return
            _isVoteOpen(proposal_) && votingToken.getPastVotes(_voter, proposal_.snapshotBlock) > 0;
    }

    /// @dev This empty reserved space is put in place to allow future versions to add new
    /// variables without shifting down storage in the inheritance chain.
    /// https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    uint256[49] private __gap;
}
