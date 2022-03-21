/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";

import "./../MajorityVotingBase.sol";

contract ERC20Voting is MajorityVotingBase {

    ERC20VotesUpgradeable public token;

    mapping(uint256 => uint64) snapshotBlocks;

    function getSnapshotBlock(uint256 _voteId) public view returns (uint64) {
        return snapshotBlocks[_voteId];
    }

    /// @dev describes the version and contract for GSN compatibility.
    function versionRecipient() external view virtual override returns (string memory) {
        return "0.0.1+opengsn.recipient.ERC20Voting";
    }

    /// @dev Used for UUPS upgradability pattern
    /// @param _dao The DAO contract of the current DAO
    function initialize(
        IDAO _dao,
        ERC20VotesUpgradeable _token,
        address _gsnForwarder,
        uint64 _participationRequiredPct,
        uint64 _supportRequiredPct,
        uint64 _minDuration
    ) public initializer {
        MajorityVotingBase.initializeBase(
            _dao,
            _gsnForwarder,
            _participationRequiredPct,
            _supportRequiredPct,
            _minDuration
        );

        token = _token;
    }

    /**
     * @notice Create a new vote on this concrete implementation
     * @param _proposalMetadata The IPFS hash pointing to the proposal metadata
     * @param _actions the actions that will be executed after vote passes
     * @param _startDate state date of the vote. If 0, uses current timestamp
     * @param _endDate end date of the vote. If 0, uses _start + minDuration
     * @param _executeIfDecided Configuration to enable automatic execution on the last required vote
     * @param _castVote Configuration to cast vote as "YES" on creation of it
     */
    function newVote(
        bytes calldata _proposalMetadata,
        IDAO.Action[] calldata _actions,
        uint64 _startDate,
        uint64 _endDate,
        bool _executeIfDecided,
        bool _castVote
    ) external override returns (uint256 voteId) {
        uint64 snapshotBlock = getBlockNumber64() - 1;

        uint256 votingPower = token.getPastTotalSupply(snapshotBlock);
        if (votingPower == 0) revert VotePowerZero();


        voteId = votesLength++;

        // calculate start and end time for the vote
        uint64 currentTimestamp = getTimestamp64();

        if (_startDate == 0) _startDate = currentTimestamp;
        if (_endDate == 0) _endDate = _startDate + minDuration;

        if(_endDate - _startDate <  minDuration || _startDate < currentTimestamp)
            revert VoteTimesForbidden({
                current: currentTimestamp,
                start: _startDate,
                end: _endDate,
                minDuration: minDuration
            });

        // create a vote.
        snapshotBlocks[voteId] = snapshotBlock;

        Vote storage vote_ = votes[voteId];
        vote_.startDate = _startDate;
        vote_.endDate = _endDate;
        vote_.supportRequiredPct = supportRequiredPct;
        vote_.participationRequiredPct = participationRequiredPct;
        vote_.votingPower = votingPower;

        for (uint256 i; i < _actions.length; i++) {
            vote_.actions.push(_actions[i]);
        }

        emit StartVote(voteId, _msgSender(), _proposalMetadata);

        if (_castVote && canVote(voteId, _msgSender())) {
            _vote(voteId, VoterState.Yea, _msgSender(), _executeIfDecided);
        }
    }

    /**
     * @dev Internal function to cast a vote. It assumes the queried vote exists.
     * @param _voteId voteId
     * @param _outcome Whether voter abstains, supports or not supports to vote.
     * @param _executesIfDecided if true, and it's the last vote required, immediatelly executes a vote.
     */
    function _vote(
        uint256 _voteId,
        VoterState _outcome,
        address _voter,
        bool _executesIfDecided
    ) internal override {
        Vote storage vote_ = votes[_voteId];
        uint64 snapshotBlock = snapshotBlocks[_voteId];

        // This could re-enter, though we can assume the governance token is not malicious
        uint256 voterStake = token.getPastVotes(_voter, snapshotBlock);
        VoterState state = vote_.voters[_voter];

        // If voter had previously voted, decrease count
        if (state == VoterState.Yea) {
            vote_.yea = vote_.yea - voterStake;
        } else if (state == VoterState.Nay) {
            vote_.nay = vote_.nay - voterStake;
        } else if (state == VoterState.Abstain) {
            vote_.abstain = vote_.abstain - voterStake;
        }

        // write the updated/new vote for the voter.
        if (_outcome == VoterState.Yea) {
            vote_.yea = vote_.yea + voterStake;
        } else if (_outcome == VoterState.Nay) {
            vote_.nay = vote_.nay + voterStake;
        } else if (_outcome == VoterState.Abstain) {
            vote_.abstain = vote_.abstain + voterStake;
        }

        vote_.voters[_voter] = _outcome;

        emit CastVote(_voteId, _voter, uint8(_outcome), voterStake);

        if (_executesIfDecided && _canExecute(_voteId)) {
            _execute(_voteId);
        }
    }

    /**
     * @dev Internal function to check if a voter can participate on a vote. It assumes the queried vote exists.
     * @param _voteId The voteId
     * @param _voter the address of the voter to check
     * @return True if the given voter can participate a certain vote, false otherwise
     */
    function _canVote(uint256 _voteId, address _voter) internal view override returns (bool) {
        Vote storage vote_ = votes[_voteId];
        uint64 snapshotBlock = snapshotBlocks[_voteId];
        return _isVoteOpen(vote_) && token.getPastVotes(_voter, snapshotBlock) > 0;
    }
}
