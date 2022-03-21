/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "./../MajorityVotingBase.sol";

contract WhitelistVoting is MajorityVotingBase {
    bytes32 public constant MODIFY_WHITELIST = keccak256("MODIFY_WHITELIST");

    uint64 private whitelistedLength;

    mapping(address => bool) public whitelisted;

    error VoteCreationForbidden(address sender);

    event AddUsers(address[] users);
    event RemoveUsers(address[] users);

    /// @dev describes the version and contract for GSN compatibility.
    function versionRecipient() external view virtual override returns (string memory) {
        return "0.0.1+opengsn.recipient.WhitelistVoting";
    }

    /// @dev Used for UUPS upgradability pattern
    /// @param _dao The DAO contract of the current DAO
    function initialize(
        IDAO _dao,
        address _gsnForwarder,
        address[] calldata _whitelisted, //TODO put to the end
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

        // add whitelisted users
        _addWhitelistedUsers(_whitelisted);
    }

    /**
     * @notice add new users to the whitelist.
     * @param _users addresses of users to add
     */
    function addWhitelistedUsers(address[] calldata _users) external auth(MODIFY_WHITELIST) {
        _addWhitelistedUsers(_users);
    }

    /**
     * @dev Internal function to add new users to the whitelist.
     * @param _users addresses of users to add
     */
    function _addWhitelistedUsers(address[] calldata _users) internal {
        for (uint256 i = 0; i < _users.length; i++) {
            whitelisted[_users[i]] = true;
        }

        whitelistedLength += uint64(_users.length);

        emit AddUsers(_users);
    }

    /**
     * @notice remove new users to the whitelist.
     * @param _users addresses of users to remove
     */
    function removeWhitelistedUsers(address[] calldata _users) external auth(MODIFY_WHITELIST) {
        for (uint256 i = 0; i < _users.length; i++) {
            whitelisted[_users[i]] = false;
        }

        whitelistedLength -= uint64(_users.length);

        emit RemoveUsers(_users);
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
        if(!whitelisted[msg.sender]) revert VoteCreationForbidden(msg.sender);

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

        voteId = votesLength++;

        // create a vote.
        Vote storage vote_ = votes[voteId];
        vote_.startDate = _startDate;
        vote_.endDate = _endDate;
        vote_.supportRequiredPct = supportRequiredPct;
        vote_.participationRequiredPct = participationRequiredPct;
        vote_.votingPower = whitelistedLength;

        for (uint256 i; i < _actions.length; i++) {
            vote_.actions.push(_actions[i]);
        }

        emit StartVote(voteId, msg.sender, _proposalMetadata);

        if (_castVote && canVote(voteId, msg.sender)) {
            _vote(voteId, VoterState.Yea, msg.sender, _executeIfDecided);
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

        VoterState state = vote_.voters[_voter];

        // If voter had previously voted, decrease count
        if (state == VoterState.Yea) {
            vote_.yea = vote_.yea - 1;
        } else if (state == VoterState.Nay) {
            vote_.nay = vote_.nay - 1;
        } else if (state == VoterState.Abstain) {
            vote_.abstain = vote_.abstain - 1;
        }

        // write the updated/new vote for the voter.
        if (_outcome == VoterState.Yea) {
            vote_.yea = vote_.yea + 1;
        } else if (_outcome == VoterState.Nay) {
            vote_.nay = vote_.nay + 1;
        } else if (_outcome == VoterState.Abstain) {
            vote_.abstain = vote_.abstain + 1;
        }

        vote_.voters[_voter] = _outcome;

        emit CastVote(_voteId, _voter, uint8(_outcome), 1);

        if (_executesIfDecided && _canExecute(_voteId)) {
            _execute(_voteId);
        }
    }

    function _canVote(uint256 _voteId, address _voter) internal view override returns (bool) {
        Vote storage vote_ = votes[_voteId];
        return _isVoteOpen(vote_) && whitelisted[_voter];
    }
}
