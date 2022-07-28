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

    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 internal constant ALLOWLIST_VOTING_INTERFACE_ID =
        MAJORITY_VOTING_INTERFACE_ID ^
            this.addAllowedUsers.selector ^
            this.removeAllowedUsers.selector ^
            this.isAllowed.selector ^
            this.allowedUserCount.selector;

    /// @notice The ID of the permission required to call the `addAllowedUsers` and `removeAllowedUsers` function.
    bytes32 public constant MODIFY_ALLOWLIST_PERMISSION_ID =
        keccak256("MODIFY_ALLOWLIST_PERMISSION");

    /// @notice The mapping containing the checkpointed history of addresses being allowed.
    mapping(address => Checkpoints.History) private _allowedAddressesCheckpoints;

    /// @notice The checkpointed history of the length of the allowlist.
    Checkpoints.History private _allowlistLengthCheckpoints;

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
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The IDAO interface of the associated DAO.
    /// @param _trustedForwarder The address of the trusted forwarder required for meta transactions.
    /// @param _participationRequiredPct The minimal required participation in percent.
    /// @param _supportRequiredPct The minimal required support in percent.
    /// @param _minDuration The minimal duration of a vote.
    /// @param _allowed The allowed addresses.
    function initialize(
        IDAO _dao,
        address _trustedForwarder,
        uint64 _participationRequiredPct,
        uint64 _supportRequiredPct,
        uint64 _minDuration,
        address[] calldata _allowed
    ) public initializer {
        _registerStandard(ALLOWLIST_VOTING_INTERFACE_ID);
        __MajorityVotingBase_init(
            _dao,
            _trustedForwarder,
            _participationRequiredPct,
            _supportRequiredPct,
            _minDuration
        );

        // add allowed users
        _addAllowedUsers(_allowed);
    }

    /// @notice Returns the version of the GSN relay recipient.
    /// @dev Describes the version and contract for GSN compatibility.
    function versionRecipient() external view virtual override returns (string memory) {
        return "0.0.1+opengsn.recipient.AllowlistVoting";
    }

    /// @notice Adds new users to the allowlist.
    /// @param _users The addresses of the users to be added.
    function addAllowedUsers(address[] calldata _users)
        external
        auth(MODIFY_ALLOWLIST_PERMISSION_ID)
    {
        _addAllowedUsers(_users);
    }

    /// @notice Internal function to add new users to the allowlist.
    /// @param _users The addresses of users to be added.
    function _addAllowedUsers(address[] calldata _users) internal {
        _updateAllowedUsers(_users, true);

        emit UsersAdded(_users);
    }

    /// @notice Removes users from the allowlist.
    /// @param _users The addresses of the users to be removed.
    function removeAllowedUsers(address[] calldata _users)
        external
        auth(MODIFY_ALLOWLIST_PERMISSION_ID)
    {
        _updateAllowedUsers(_users, false);

        emit UsersRemoved(_users);
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

        if (!isAllowed(_msgSender(), snapshotBlock)) {
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
        vote_.votingPower = allowedUserCount(snapshotBlock);

        unchecked {
            for (uint256 i = 0; i < _actions.length; i++) {
                vote_.actions.push(_actions[i]);
            }
        }

        emit VoteCreated(voteId, _msgSender(), _proposalMetadata);

        if (_choice != VoteOption.None && canVote(voteId, _msgSender())) {
            _vote(voteId, VoteOption.Yes, _msgSender(), _executeIfDecided);
        }
    }

    /// @inheritdoc MajorityVotingBase
    function _vote(
        uint256 _voteId,
        VoteOption _choice,
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
        if (_choice == VoteOption.Yes) {
            vote_.yes = vote_.yes + 1;
        } else if (_choice == VoteOption.No) {
            vote_.no = vote_.no + 1;
        } else if (_choice == VoteOption.Abstain) {
            vote_.abstain = vote_.abstain + 1;
        }

        vote_.voters[_voter] = _choice;

        emit VoteCast(_voteId, _voter, uint8(_choice), 1);

        if (_executesIfDecided && _canExecute(_voteId)) {
            _execute(_voteId);
        }
    }

    /// @notice Checks if a user is allowed at given block number.
    /// @param account The user address that is checked.
    /// @param blockNumber The block number.
    function isAllowed(address account, uint256 blockNumber) public view returns (bool) {
        if (blockNumber == 0) blockNumber = getBlockNumber64() - 1;

        return _allowedAddressesCheckpoints[account].getAtBlock(blockNumber) == 1;
    }

    /// @notice Returns total count of users that are allowed at given block number.
    /// @param blockNumber The specific block to get the count from.
    /// @return The count of users that were allowed at the specified block number.
    function allowedUserCount(uint256 blockNumber) public view returns (uint256) {
        if (blockNumber == 0) blockNumber = getBlockNumber64() - 1;

        return _allowlistLengthCheckpoints.getAtBlock(blockNumber);
    }

    /// @inheritdoc MajorityVotingBase
    function _canVote(uint256 _voteId, address _voter) internal view override returns (bool) {
        Vote storage vote_ = votes[_voteId];
        return _isVoteOpen(vote_) && isAllowed(_voter, vote_.snapshotBlock);
    }

    /// @notice Updates the allowlist by adding or removing users.
    /// @param _users The user addresses.
    /// @param _enabled Whether to add or remove users from the allowlist.
    function _updateAllowedUsers(address[] calldata _users, bool _enabled) internal {
        _allowlistLengthCheckpoints.push(_enabled ? _uncheckedAdd : _uncheckedSub, _users.length);

        for (uint256 i = 0; i < _users.length; i++) {
            _allowedAddressesCheckpoints[_users[i]].push(_enabled ? 1 : 0);
        }
    }
}
