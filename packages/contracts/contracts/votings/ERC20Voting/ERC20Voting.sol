/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";

import "./../../core/component/Component.sol";
import "./../../core/IDAO.sol";
import "./../../utils/TimeHelpers.sol";

contract ERC20Voting is Component, TimeHelpers {
    bytes32 public constant MODIFY_CONFIG = keccak256("MODIFY_VOTE_CONFIG");

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
        uint64 snapshotBlock;
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

    ERC20VotesUpgradeable public token;

    string private constant ERROR_VOTE_DATES_WRONG = "VOTING_DURATION_TIME_WRONG";
    string private constant ERROR_MIN_DURATION_NO_ZERO = "VOTING_MIN_DURATION_NO_ZERO";
    string private constant ERROR_SUPPORT_TOO_BIG = "VOTING_SUPPORT_TOO_BIG";
    string private constant ERROR_PARTICIPATION_TOO_BIG = "VOTING_PARTICIPATION_TOO_BIG";
    string private constant ERROR_CAN_NOT_VOTE = "VOTING_CAN_NOT_VOTE";
    string private constant ERROR_CAN_NOT_EXECUTE = "VOTING_CAN_NOT_EXECUTE";
    string private constant ERROR_CAN_NOT_FORWARD = "VOTING_CAN_NOT_FORWARD";
    string private constant ERROR_NO_VOTING_POWER = "VOTING_NO_VOTING_POWER";

    event StartVote(uint256 indexed voteId, address indexed creator, bytes description);
    event CastVote(uint256 indexed voteId, address indexed voter, uint8 voterState, uint256 stake);
    event ExecuteVote(uint256 indexed voteId, bytes[] execResults);
    event UpdateConfig(uint64 participationRequiredPct, uint64 supportRequiredPct, uint64 minDuration);

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
        require(_supportRequiredPct <= PCT_BASE, ERROR_SUPPORT_TOO_BIG);
        require(_participationRequiredPct <= PCT_BASE, ERROR_PARTICIPATION_TOO_BIG);
        require(_minDuration > 0, ERROR_MIN_DURATION_NO_ZERO);

        token = _token;
        participationRequiredPct = _participationRequiredPct;
        supportRequiredPct = _supportRequiredPct;
        minDuration = _minDuration;

        Component.initialize(_dao, _gsnForwarder);

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
    ) external auth(MODIFY_CONFIG) {
        require(_supportRequiredPct <= PCT_BASE, ERROR_SUPPORT_TOO_BIG);
        require(_participationRequiredPct <= PCT_BASE, ERROR_PARTICIPATION_TOO_BIG);
        require(_minDuration > 0, ERROR_MIN_DURATION_NO_ZERO);

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
    ) external returns (uint256 voteId) {
        uint64 snapshotBlock = getBlockNumber64() - 1;

        uint256 votingPower = token.getPastTotalSupply(snapshotBlock);
        require(votingPower > 0, ERROR_NO_VOTING_POWER);

        voteId = votesLength++;

        // calculate start and end time for the vote
        uint64 currentTimestamp = getTimestamp64();

        if (_startDate == 0) _startDate = currentTimestamp;
        if (_endDate == 0) _endDate = _startDate + minDuration;

        require(_endDate - _startDate >= minDuration || _startDate >= currentTimestamp, ERROR_VOTE_DATES_WRONG);

        // create a vote.
        Vote storage vote_ = votes[voteId];
        vote_.startDate = _startDate;
        vote_.endDate = _endDate;
        vote_.snapshotBlock = snapshotBlock;
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
     * @notice Vote `[outcome = 1 = abstain], [outcome = 2 = supports], [outcome = 1 = not supports]
     * @param _voteId Id for vote
     * @param _outcome Whether voter abstains, supports or not supports to vote.
     * @param _executesIfDecided Whether the vote should execute its action if it becomes decided
     */
    function vote(
        uint256 _voteId,
        VoterState _outcome,
        bool _executesIfDecided
    ) external {
        require(_canVote(_voteId, _msgSender()), ERROR_CAN_NOT_VOTE);
        _vote(_voteId, _outcome, _msgSender(), _executesIfDecided);
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
    ) internal {
        Vote storage vote_ = votes[_voteId];

        // This could re-enter, though we can assume the governance token is not malicious
        uint256 voterStake = token.getPastVotes(_voter, vote_.snapshotBlock);
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
     * @dev Method to execute a vote if allowed to
     * @param _voteId The ID of the vote to execute
     */
    function execute(uint256 _voteId) public {
        require(_canExecute(_voteId), ERROR_CAN_NOT_EXECUTE);
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
     * @return snapshotBlock snapshot block
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
            uint64 snapshotBlock,
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
        snapshotBlock = vote_.snapshotBlock;
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
    function _canVote(uint256 _voteId, address _voter) internal view returns (bool) {
        Vote storage vote_ = votes[_voteId];
        return _isVoteOpen(vote_) && token.getPastVotes(_voter, vote_.snapshotBlock) > 0;
    }

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
