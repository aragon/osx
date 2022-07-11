// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/Checkpoints.sol";

import "../../utils/UncheckedMath.sol";
import "../majority/MajorityVotingBase.sol";

/// @title AllowlistVoting
/// @author Aragon Association - 2021-2022.
/// @notice The majority voting implementation using an list of allowed addresses.
/// @dev This contract inherits from `MajorityVotingBase` and implements the `IMajorityVoting` interface.
contract AllowlistVoting is MajorityVotingBase {
    using Checkpoints for Checkpoints.History;

    bytes4 internal constant WHITELIST_VOTING_INTERFACE_ID =
        MAJORITY_VOTING_INTERFACE_ID ^
            this.addAllowlistedUsers.selector ^
            this.removeAllowlistedUsers.selector ^
            this.isUserAllowlisted.selector ^
            this.allowlistedUserCount.selector;

    bytes32 public constant MODIFY_WHITELIST = keccak256("MODIFY_WHITELIST");

    mapping(address => Checkpoints.History) private _checkpoints;
    Checkpoints.History private _totalCheckpoints;

    /// @notice Thrown when a sender is not allowed to create a vote.
    /// @param sender The sender address.
    error VoteCreationForbidden(address sender);

    /// @notice Emitted when new users are added to the allowlist.
    /// @param users The array of user addresses to be added.
    event UsersAdded(address[] users);

    /// @notice Emitted when users are removed from the allowlist.
    /// @param users The array of user addresses to be removed.
    event UsersRemoved(address[] users);

    /// @notice Initializes the component.
    /// @dev This method is required to support the Universal Upgradeable Proxy Standard (UUPS).
    /// @param _dao The IDAO interface of the associated DAO.
    /// @param _trustedForwarder The address of the trusted GSN forwarder required for meta transactions.
    /// @param _participationRequiredPct The minimal required participation in percent.
    /// @param _supportRequiredPct The minimal required support in percent.
    /// @param _minDuration The minimal duration of a vote.
    /// @param _allowlisted The allowlisted addresses.
    function initialize(
        IDAO _dao,
        address _trustedForwarder,
        uint64 _participationRequiredPct,
        uint64 _supportRequiredPct,
        uint64 _minDuration,
        address[] calldata _allowlisted
    ) public initializer {
        _registerStandard(WHITELIST_VOTING_INTERFACE_ID);
        __MajorityVotingBase_init(
            _dao,
            _trustedForwarder,
            _participationRequiredPct,
            _supportRequiredPct,
            _minDuration
        );

        // add allowlisted users
        _addAllowlistedUsers(_allowlisted);
    }

    /// @notice Returns the version of the GSN relay recipient.
    /// @dev Describes the version and contract for GSN compatibility.
    function versionRecipient() external view virtual override returns (string memory) {
        return "0.0.1+opengsn.recipient.AllowlistVoting";
    }

    /// @notice Adds new users to the allowlist.
    /// @param _users The addresses of the users to be added.
    function addAllowlistedUsers(address[] calldata _users) external auth(MODIFY_WHITELIST) {
        _addAllowlistedUsers(_users);
    }

    /// @notice Internal function to add new users to the allowlist.
    /// @param _users The addresses of users to be added.
    function _addAllowlistedUsers(address[] calldata _users) internal {
        _allowlistUsers(_users, true);

        emit UsersAdded(_users);
    }

    /// @notice Removes users from the allowlist.
    /// @param _users The addresses of the users to be removed.
    function removeAllowlistedUsers(address[] calldata _users) external auth(MODIFY_WHITELIST) {
        _allowlistUsers(_users, false);

        emit UsersRemoved(_users);
    }

    /// @inheritdoc IMajorityVoting
    function createVote(
        bytes calldata _proposalMetadata,
        IDAO.Action[] calldata _actions,
        uint64 _startDate,
        uint64 _endDate,
        bool _executeIfDecided,
        VoteOption _voteOption
    ) external override returns (uint256 voteId) {
        uint64 snapshotBlock = getBlockNumber64() - 1;

        if (!isUserAllowlisted(_msgSender(), snapshotBlock)) {
            revert VoteCreationForbidden(_msgSender());
        }

        // calculate start and end time for the vote
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

        voteId = votesLength++;

        // create a vote.
        Vote storage vote_ = votes[voteId];
        vote_.startDate = _startDate;
        vote_.endDate = _endDate;
        vote_.snapshotBlock = snapshotBlock;
        vote_.supportRequiredPct = supportRequiredPct;
        vote_.participationRequiredPct = participationRequiredPct;
        vote_.votingPower = allowlistedUserCount(snapshotBlock);

        unchecked {
            for (uint256 i = 0; i < _actions.length; i++) {
                vote_.actions.push(_actions[i]);
            }
        }

        emit VoteStarted(voteId, _msgSender(), _proposalMetadata);

        if (_voteOption != VoteOption.None && canVote(voteId, _msgSender())) {
            _vote(voteId, VoteOption.Yes, _msgSender(), _executeIfDecided);
        }
    }

    /// @inheritdoc MajorityVotingBase
    function _vote(
        uint256 _voteId,
        VoteOption _voteOption,
        address _voter,
        bool _executesIfDecided
    ) internal override {
        Vote storage vote_ = votes[_voteId];

        VoteOption state = vote_.voters[_voter];

        // If voter had previously voted, decrease count
        if (state == VoteOption.Yes) {
            vote_.yes = vote_.yes - 1;
        } else if (state == VoteOption.No) {
            vote_.no = vote_.no - 1;
        } else if (state == VoteOption.Abstain) {
            vote_.abstain = vote_.abstain - 1;
        }

        // write the updated/new vote for the voter.
        if (_voteOption == VoteOption.Yes) {
            vote_.yes = vote_.yes + 1;
        } else if (_voteOption == VoteOption.No) {
            vote_.no = vote_.no + 1;
        } else if (_voteOption == VoteOption.Abstain) {
            vote_.abstain = vote_.abstain + 1;
        }

        vote_.voters[_voter] = _voteOption;

        emit VoteCast(_voteId, _voter, uint8(_voteOption), 1);

        if (_executesIfDecided && _canExecute(_voteId)) {
            _execute(_voteId);
        }
    }

    /// @notice Checks if a user is allowlisted at given block number.
    /// @param account The user address that is checked.
    /// @param blockNumber The block number.
    function isUserAllowlisted(address account, uint256 blockNumber) public view returns (bool) {
        if (blockNumber == 0) blockNumber = getBlockNumber64() - 1;

        return _checkpoints[account].getAtBlock(blockNumber) == 1;
    }

    /// @notice Returns total count of users that are allowlisted at given block number.
    /// @param blockNumber The specific block to get the count from.
    /// @return The count of users that were allowlisted at the specified block number.
    function allowlistedUserCount(uint256 blockNumber) public view returns (uint256) {
        if (blockNumber == 0) blockNumber = getBlockNumber64() - 1;

        return _totalCheckpoints.getAtBlock(blockNumber);
    }

    /// @inheritdoc MajorityVotingBase
    function _canVote(uint256 _voteId, address _voter) internal view override returns (bool) {
        Vote storage vote_ = votes[_voteId];
        return _isVoteOpen(vote_) && isUserAllowlisted(_voter, vote_.snapshotBlock);
    }

    /// @notice Adds or removes users from allowlist.
    /// @param _users The user addresses.
    /// @param _enabled Whether to add or remove users from the allowlist.
    function _allowlistUsers(address[] calldata _users, bool _enabled) internal {
        _totalCheckpoints.push(_enabled ? _uncheckedAdd : _uncheckedSub, _users.length);

        for (uint256 i = 0; i < _users.length; i++) {
            _checkpoints[_users[i]].push(_enabled ? 1 : 0);
        }
    }
}
