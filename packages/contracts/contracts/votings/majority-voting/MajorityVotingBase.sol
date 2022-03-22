/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "./../../core/component/Component.sol";
import "./../../core/IDAO.sol";
import "./../../utils/TimeHelpers.sol";

abstract contract MajorityVotingBase is Component, TimeHelpers {
    bytes32 public constant MODIFY_VOTE_CONFIG = keccak256("MODIFY_VOTE_CONFIG");

    uint64 public constant PCT_BASE = 10**18; // 0% = 0; 1% = 10^16; 100% = 10^18

    enum VoterState {
        None,
        Abstain,
        Yea,
        Nay
    }

    struct Vote {
        bool executed;
        uint64 startDate;
        uint64 endDate;
        uint64 supportRequiredPct;
        uint64 participationRequiredPct;
        uint256 yea;
        uint256 nay;
        uint256 abstain;
        uint256 votingPower;
        mapping(address => VoterState) voters;
        IDAO.Action[] actions;
    }

    mapping(uint256 => Vote) internal votes;

    uint64 public supportRequiredPct;
    uint64 public participationRequiredPct;
    uint64 public minDuration;
    uint256 public votesLength;

    error VoteSupportExceeded(uint64 limit, uint64 actual);
    error VoteParticipationExceeded(uint64 limit, uint64 actual);
    error VoteTimesForbidden(uint64 current, uint64 start, uint64 end, uint64 minDuration);
    error VoteDurationZero();
    error VoteCastForbidden(uint256 voteId, address sender);
    error VoteExecutionForbidden(uint256 voteId);
    error VotePowerZero();

    event StartVote(uint256 indexed voteId, address indexed creator, bytes description);
    event CastVote(uint256 indexed voteId, address indexed voter, uint8 voterState, uint256 voterWeight);
    event ExecuteVote(uint256 indexed voteId, bytes[] execResults);
    event UpdateConfig(uint64 participationRequiredPct, uint64 supportRequiredPct, uint64 minDuration);

    /// @dev describes the version and contract for GSN compatibility.
    function versionRecipient() external view virtual override returns (string memory);

    /// @dev Used for UUPS upgradability pattern
    /// @param _dao The DAO contract of the current DAO
    function __MajorityVotingBase_init(
        IDAO _dao,
        address _gsnForwarder,
        uint64 _participationRequiredPct,
        uint64 _supportRequiredPct,
        uint64 _minDuration
    ) internal initializer {
        if(_supportRequiredPct > PCT_BASE)
            revert VoteSupportExceeded({limit: PCT_BASE, actual: _supportRequiredPct});
        if(_participationRequiredPct > PCT_BASE)
            revert VoteParticipationExceeded({limit: PCT_BASE, actual: _participationRequiredPct});
        if(_minDuration == 0)
            revert VoteDurationZero();

        __Component_init(_dao, _gsnForwarder);

        participationRequiredPct = _participationRequiredPct;
        supportRequiredPct = _supportRequiredPct;
        minDuration = _minDuration;

        emit UpdateConfig(_participationRequiredPct, _supportRequiredPct, _minDuration);
    }

    /**
     * @notice Change required support and minQuorum
     * @param _supportRequiredPct New required support
     * @param _participationRequiredPct New acceptance quorum
     * @param _minDuration each vote's minimum duration
     */
    function changeVoteConfig(
        uint64 _participationRequiredPct,
        uint64 _supportRequiredPct,
        uint64 _minDuration
    ) external auth(MODIFY_VOTE_CONFIG) {
        if(_supportRequiredPct > PCT_BASE)
            revert VoteSupportExceeded({limit: PCT_BASE, actual: _supportRequiredPct});
        if(_participationRequiredPct > PCT_BASE)
            revert VoteParticipationExceeded({limit: PCT_BASE, actual: _participationRequiredPct});
        if(_minDuration == 0)
            revert VoteDurationZero();

        participationRequiredPct = _participationRequiredPct;
        supportRequiredPct = _supportRequiredPct;
        minDuration = _minDuration;

        emit UpdateConfig(_participationRequiredPct, _supportRequiredPct, _minDuration);
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
    ) external virtual returns (uint256 voteId);

    /**
     * @notice Vote `[outcome = 1 = abstain], [outcome = 2 = supports], [outcome = 1 = not supports]
     * @param _voteId Id for vote
     * @param  _choice Whether voter abstains, supports or not supports to vote.
     * @param _executesIfDecided Whether the vote should execute its action if it becomes decided
     */
    function vote(
        uint256 _voteId,
        VoterState _choice,
        bool _executesIfDecided
    ) external {
        if(!_canVote(_voteId, msg.sender)) revert VoteCastForbidden(_voteId, msg.sender);
        _vote(_voteId, _choice, _msgSender(), _executesIfDecided);
    }

    /**
     * @dev Internal function to cast a vote. It assumes the queried vote exists.
     * @param _voteId voteId
     * @param _choice Whether voter abstains, supports or not supports to vote.
     * @param _executesIfDecided if true, and it's the last vote required, immediatelly executes a vote.
     */
    function _vote(
        uint256 _voteId,
        VoterState _choice,
        address _voter,
        bool _executesIfDecided
    ) internal virtual;

    /**
     * @dev Method to execute a vote if allowed to
     * @param _voteId The ID of the vote to execute
     */
    function execute(uint256 _voteId) public {
        if(!_canExecute(_voteId)) revert VoteExecutionForbidden(_voteId);
        _execute(_voteId);
    }

    /**
     * @dev Internal function to execute a vote. It assumes the queried vote exists.
     * @param _voteId the vote Id
     */
    function _execute(uint256 _voteId) internal {
        bytes[] memory execResults = dao.execute(_voteId, votes[_voteId].actions);

        votes[_voteId].executed = true;

        emit ExecuteVote(_voteId, execResults);
    }

    /**
     * @dev Return the state of a voter for a given vote by its ID
     * @param _voteId Vote identifier
     * @return VoterState of the requested voter for a certain vote
     */
    function getVoterState(uint256 _voteId, address _voter) public view returns (VoterState) {
        return votes[_voteId].voters[_voter];
    }

    /**
     * @dev Internal function to check if a voter can participate on a vote. It assumes the queried vote exists.
     * @param _voteId the vote Id
     * @param _voter the address of the voter to check
     * @return bool true if user is allowed to vote
     */
    function canVote(uint256 _voteId, address _voter) public view returns (bool) {
        return _canVote(_voteId, _voter);
    }

    /**
     * @notice Tells whether a vote #`_voteId` can be executed or not
     * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
     *      created via `newVote(),` which requires initialization
     * @return True if the given vote can be executed, false otherwise
     */
    function canExecute(uint256 _voteId) public view returns (bool) {
        return _canExecute(_voteId);
    }

    /**
     * @dev Return all information for a vote by its ID
     * @param _voteId Vote id
     * @return open Vote open status
     * @return executed Vote executed status
     * @return startDate start date
     * @return endDate end date
     * @return supportRequired support required
     * @return participationRequired minimum participation required
     * @return votingPower power
     * @return yea yeas amount
     * @return nay nays amount
     * @return abstain abstain amount
     * @return actions Actions
     */
    function getVote(uint256 _voteId)
    public
    view
    returns (
        bool open,
        bool executed,
        uint64 startDate,
        uint64 endDate,
        uint64 supportRequired,
        uint64 participationRequired,
        uint256 votingPower,
        uint256 yea,
        uint256 nay,
        uint256 abstain,
        IDAO.Action[] memory actions
    )
    {
        Vote storage vote_ = votes[_voteId];

        open = _isVoteOpen(vote_);
        executed = vote_.executed;
        startDate = vote_.startDate;
        endDate = vote_.endDate;
        supportRequired = vote_.supportRequiredPct;
        participationRequired = vote_.participationRequiredPct;
        votingPower = vote_.votingPower;
        yea = vote_.yea;
        nay = vote_.nay;
        abstain = vote_.abstain;
        actions = vote_.actions;
    }


    /**
     * @dev Internal function to check if a voter can participate on a vote. It assumes the queried vote exists.
     * @param _voteId The voteId
     * @param _voter the address of the voter to check
     * @return True if the given voter can participate a certain vote, false otherwise
     */
    function _canVote(uint256 _voteId, address _voter) internal view virtual returns (bool);

    /**
     * @dev Internal function to check if a vote is still open
     * @param vote_ the vote struct
     * @return True if the given vote is open, false otherwise
     */
    function _isVoteOpen(Vote storage vote_) internal view returns (bool) {
        return getTimestamp64() < vote_.endDate && getTimestamp64() >= vote_.startDate && !vote_.executed;
    }

    /**
     * @dev Internal function to check if a vote can be executed. It assumes the queried vote exists.
     * @param _voteId vote id
     * @return True if the given vote can be executed, false otherwise
     */
    function _canExecute(uint256 _voteId) internal view returns (bool) {
        Vote storage vote_ = votes[_voteId];

        if (vote_.executed) {
            return false;
        }

        // Voting is already decided
        if (_isValuePct(vote_.yea, vote_.votingPower, vote_.supportRequiredPct)) {
            return true;
        }

        // Vote ended?
        if (_isVoteOpen(vote_)) {
            return false;
        }

        uint256 totalVotes = vote_.yea + vote_.nay;

        // Have enough people's stakes participated ? then proceed.
        if (!_isValuePct(totalVotes + vote_.abstain, vote_.votingPower, vote_.participationRequiredPct)) {
            return false;
        }

        // Has enough support?
        if (!_isValuePct(vote_.yea, totalVotes, vote_.supportRequiredPct)) {
            return false;
        }

        return true;
    }

    /**
     * @dev Calculates whether `_value` is more than a percentage `_pct` of `_total`
     * @param _value the current value
     * @param _total the total value
     * @param _pct the required support percentage
     * @return returns if the _value is _pct or more percentage of _total.
     */
    function _isValuePct(
        uint256 _value,
        uint256 _total,
        uint256 _pct
    ) internal pure returns (bool) {
        if (_total == 0) {
            return false;
        }

        uint256 computedPct = (_value * PCT_BASE) / _total;
        return computedPct > _pct;
    }
}
