// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {ERC20VotesUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";

import {MajorityVotingBase} from "../majority/MajorityVotingBase.sol";
import {IDAO} from "../../core/IDAO.sol";
import {IMajorityVoting} from "../majority/IMajorityVoting.sol";

/// @title ERC20Voting
/// @author Aragon Association - 2021-2022
/// @notice The majority voting implementation using an ERC-20 token.
/// @dev This contract inherits from `MajorityVotingBase` and implements the `IMajorityVoting` interface.
contract ERC20Voting is MajorityVotingBase {
    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 internal constant ERC20_VOTING_INTERFACE_ID =
        this.getVotingToken.selector ^ this.initialize.selector;

    /// @notice An [ERC20Votes](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Votes) compatible contract referencing the token being used for voting.
    ERC20VotesUpgradeable private votingToken;

    /// @notice Thrown if the voting power is zero
    error NoVotingPower();

    /// @notice Initializes the component.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The IDAO interface of the associated DAO.
    /// @param _totalSupportThresholdPct The total support threshold in percent.
    /// @param _relativeSupportThresholdPct The relative support threshold in percent.
    /// @param _minDuration The minimal duration of a vote.
    /// @param _token The [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token used for voting.
    function initialize(
        IDAO _dao,
        uint64 _totalSupportThresholdPct,
        uint64 _relativeSupportThresholdPct,
        uint64 _minDuration,
        ERC20VotesUpgradeable _token
    ) public initializer {
        __MajorityVotingBase_init(
            _dao,
            _totalSupportThresholdPct,
            _relativeSupportThresholdPct,
            _minDuration
        );

        votingToken = _token;
    }

    /// @notice adds a IERC165 to check whether contract supports ERC20_VOTING_INTERFACE_ID or not.
    /// @dev See {ERC165Upgradeable-supportsInterface}.
    /// @return bool whether it supports the IERC165 or ERC20_VOTING_INTERFACE_ID
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == ERC20_VOTING_INTERFACE_ID || super.supportsInterface(interfaceId);
    }

    /// @notice getter function for the voting token.
    /// @dev public function also useful for registering interfaceId and for distinguishing from majority voting interface.
    /// @return ERC20VotesUpgradeable the token used for voting.
    function getVotingToken() public view returns (ERC20VotesUpgradeable) {
        return votingToken;
    }

    /// @inheritdoc IMajorityVoting
    function createVote(
        bytes calldata _proposalMetadata,
        IDAO.Action[] calldata _actions,
        uint64 _startDate,
        uint64 _endDate,
        bool _executeIfDecided,
        VoteOption _choice
    ) external override returns (uint256 voteId) {
        uint64 snapshotBlock = getBlockNumber64() - 1;

        uint256 census = votingToken.getPastTotalSupply(snapshotBlock);
        if (census == 0) revert NoVotingPower();

        voteId = votesLength++;

        // Calculate the start and end time of the vote
        uint64 currentTimestamp = getTimestamp64();

        if (_startDate == 0) _startDate = currentTimestamp;
        if (_endDate == 0) _endDate = _startDate + minDuration;

        if (_endDate - _startDate < minDuration || _startDate < currentTimestamp)
            revert VoteTimesInvalid({
                current: currentTimestamp,
                start: _startDate,
                end: _endDate,
                minDuration: minDuration
            });

        // Create the vote
        Vote storage vote_ = votes[voteId];
        vote_.startDate = _startDate;
        vote_.endDate = _endDate;
        vote_.relativeSupportThresholdPct = relativeSupportThresholdPct;
        vote_.totalSupportThresholdPct = totalSupportThresholdPct;
        vote_.census = census;
        vote_.snapshotBlock = snapshotBlock;

        unchecked {
            for (uint256 i = 0; i < _actions.length; i++) {
                vote_.actions.push(_actions[i]);
            }
        }

        emit VoteCreated(voteId, _msgSender(), _proposalMetadata);

        vote(voteId, _choice, _executeIfDecided);
    }

    /// @inheritdoc MajorityVotingBase
    function _vote(
        uint256 _voteId,
        VoteOption _choice,
        address _voter,
        bool _executesIfDecided
    ) internal override {
        Vote storage vote_ = votes[_voteId];

        // This could re-enter, though we can assume the governance token is not malicious
        uint256 votingPower = votingToken.getPastVotes(_voter, vote_.snapshotBlock);
        VoteOption state = vote_.voters[_voter];

        // If voter had previously voted, decrease count
        if (state == VoteOption.Yes) {
            vote_.yes = vote_.yes - votingPower;
        } else if (state == VoteOption.No) {
            vote_.no = vote_.no - votingPower;
        } else if (state == VoteOption.Abstain) {
            vote_.abstain = vote_.abstain - votingPower;
        }

        // write the updated/new vote for the voter.
        if (_choice == VoteOption.Yes) {
            vote_.yes = vote_.yes + votingPower;
        } else if (_choice == VoteOption.No) {
            vote_.no = vote_.no + votingPower;
        } else if (_choice == VoteOption.Abstain) {
            vote_.abstain = vote_.abstain + votingPower;
        }

        vote_.voters[_voter] = _choice;

        emit VoteCast(_voteId, _voter, uint8(_choice), votingPower);

        if (_executesIfDecided && _canExecute(_voteId)) {
            _execute(_voteId);
        }
    }

    /// @inheritdoc MajorityVotingBase
    function _canVote(uint256 _voteId, address _voter) internal view override returns (bool) {
        Vote storage vote_ = votes[_voteId];
        return _isVoteOpen(vote_) && votingToken.getPastVotes(_voter, vote_.snapshotBlock) > 0;
    }

    /// @dev This empty reserved space is put in place to allow future versions to add new
    /// variables without shifting down storage in the inheritance chain.
    /// https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    uint256[49] private __gap;
}
