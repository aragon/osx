// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/Checkpoints.sol";

import "../majority/MajorityVoting.sol";

/// @title A component for whitelist voting
/// @author Aragon Association - 2021-2022
/// @notice The majority voting implementation using an ERC-20 token
/// @dev This contract inherits from `MajorityVoting` and implements the `IMajorityVoting` interface
contract WhitelistVoting is MajorityVoting {
    using Checkpoints for Checkpoints.History;

    bytes4 internal constant WHITELIST_VOTING_INTERFACE_ID =
        MAJORITY_VOTING_INTERFACE_ID ^
            this.addWhitelistedUsers.selector ^
            this.removeWhitelistedUsers.selector ^
            this.isUserWhitelisted.selector ^
            this.whitelistedUserCount.selector;

    bytes32 public constant MODIFY_WHITELIST = keccak256("MODIFY_WHITELIST");

    mapping(address => Checkpoints.History) private _checkpoints;
    Checkpoints.History private _totalCheckpoints;

    /// @notice Thrown when a sender is not allowed to create a vote
    /// @param sender The sender address
    error VoteCreationForbidden(address sender);

    /// @notice Emitted when new users are added to the whitelist
    /// @param users The array of user addresses to be added
    event UsersAdded(address[] users);

    /// @notice Emitted when users are removed from the whitelist
    /// @param users The array of user addresses to be removed
    event UsersRemoved(address[] users);

    /// @notice Initializes the component
    /// @dev This is required for the UUPS upgradability pattern
    /// @param _dao The IDAO interface of the associated DAO
    /// @param _gsnForwarder The address of the trusted GSN forwarder required for meta transactions
    /// @param _participationRequiredPct The minimal required participation in percent.
    /// @param _supportRequiredPct The minimal required support in percent.
    /// @param _minDuration The minimal duration of a vote
    /// @param _whitelisted The whitelisted addresses
    function initialize(
        IDAO _dao,
        address _gsnForwarder,
        uint64 _participationRequiredPct,
        uint64 _supportRequiredPct,
        uint64 _minDuration,
        address[] calldata _whitelisted
    ) public initializer {
        _registerStandard(WHITELIST_VOTING_INTERFACE_ID);
        __MajorityVoting_init(
            _dao,
            _gsnForwarder,
            _participationRequiredPct,
            _supportRequiredPct,
            _minDuration
        );

        // add whitelisted users
        _addWhitelistedUsers(_whitelisted);
    }

    /// @notice Returns the version of the GSN relay recipient
    /// @dev Describes the version and contract for GSN compatibility
    function versionRecipient() external view virtual override returns (string memory) {
        return "0.0.1+opengsn.recipient.WhitelistVoting";
    }

    /// @notice Adds new users to the whitelist
    /// @param _users The addresses of the users to be added
    function addWhitelistedUsers(address[] calldata _users) external auth(MODIFY_WHITELIST) {
        _addWhitelistedUsers(_users);
    }

    /// @notice Internal function to add new users to the whitelist
    /// @param _users The addresses of users to be added
    function _addWhitelistedUsers(address[] calldata _users) internal {
        _whitelistUsers(_users, true);

        emit UsersAdded(_users);
    }

    /// @notice Removes users from the whitelist
    /// @param _users The addresses of the users to be removed
    function removeWhitelistedUsers(address[] calldata _users) external auth(MODIFY_WHITELIST) {
        _whitelistUsers(_users, false);

        emit UsersRemoved(_users);
    }

    /// @inheritdoc IMajorityVoting
    function newVote(
        bytes calldata _proposalMetadata,
        IDAO.Action[] calldata _actions,
        uint64 _startDate,
        uint64 _endDate,
        bool _executeIfDecided,
        VoterState _choice
    ) external override returns (uint256 voteId) {
        uint64 snapshotBlock = getBlockNumber64() - 1;

        if (!isUserWhitelisted(_msgSender(), snapshotBlock)) {
            revert VoteCreationForbidden(_msgSender());
        }

        // calculate start and end time for the vote
        uint64 currentTimestamp = getTimestamp64();

        if (_startDate == 0) _startDate = currentTimestamp;
        if (_endDate == 0) _endDate = _startDate + minDuration;

        if (_endDate - _startDate < minDuration || _startDate < currentTimestamp)
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
        vote_.snapshotBlock = snapshotBlock;
        vote_.supportRequiredPct = supportRequiredPct;
        vote_.participationRequiredPct = participationRequiredPct;
        vote_.votingPower = whitelistedUserCount(snapshotBlock);

        unchecked {
            for (uint256 i = 0; i < _actions.length; i++) {
                vote_.actions.push(_actions[i]);
            }
        }

        emit VoteStarted(voteId, _msgSender(), _proposalMetadata);

        if (_choice != VoterState.None && canVote(voteId, _msgSender())) {
            _vote(voteId, VoterState.Yea, _msgSender(), _executeIfDecided);
        }
    }

    /// @inheritdoc MajorityVoting
    function _vote(
        uint256 _voteId,
        VoterState _choice,
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
        if (_choice == VoterState.Yea) {
            vote_.yea = vote_.yea + 1;
        } else if (_choice == VoterState.Nay) {
            vote_.nay = vote_.nay + 1;
        } else if (_choice == VoterState.Abstain) {
            vote_.abstain = vote_.abstain + 1;
        }

        vote_.voters[_voter] = _choice;

        emit VoteCast(_voteId, _voter, uint8(_choice), 1);

        if (_executesIfDecided && _canExecute(_voteId)) {
            _execute(_voteId);
        }
    }

    /// @notice Checks if a user is whitelisted at given block number
    /// @param account The user address that is checked
    /// @param blockNumber The block number
    function isUserWhitelisted(address account, uint256 blockNumber) public view returns (bool) {
        if (blockNumber == 0) blockNumber = getBlockNumber64() - 1;

        return _checkpoints[account].getAtBlock(blockNumber) == 1;
    }

    /// @notice Returns total count of users that are whitelisted at given block number
    /// @param blockNumber The specific block to get the count from
    /// @return The user count that were whitelisted at the specified block number
    function whitelistedUserCount(uint256 blockNumber) public view returns (uint256) {
        if (blockNumber == 0) blockNumber = getBlockNumber64() - 1;

        return _totalCheckpoints.getAtBlock(blockNumber);
    }

    /// @inheritdoc MajorityVoting
    function _canVote(uint256 _voteId, address _voter) internal view override returns (bool) {
        Vote storage vote_ = votes[_voteId];
        return _isVoteOpen(vote_) && isUserWhitelisted(_voter, vote_.snapshotBlock);
    }

    /// @notice Adds or removes users from whitelist
    /// @param _users user addresses
    /// @param _enabled whether to add or remove from whitelist
    function _whitelistUsers(address[] calldata _users, bool _enabled) internal {
        _totalCheckpoints.push(_enabled ? _add : _sub, _users.length);

        for (uint256 i = 0; i < _users.length; i++) {
            _checkpoints[_users[i]].push(_enabled ? 1 : 0);
        }
    }

    function _add(uint256 a, uint256 b) private pure returns (uint256) {
        unchecked {
            return a + b;
        }
    }

    function _sub(uint256 a, uint256 b) private pure returns (uint256) {
        unchecked {
            return a - b;
        }
    }
}
