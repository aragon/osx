/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/Checkpoints.sol";
import "./../majority/MajorityVoting.sol";

/// @title A component for whitelist voting
/// @author Giorgi Lagidze, Samuel Furter - Aragon Association - 2021-2022
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

    error VoteCreationForbidden(address sender);

    event AddUsers(address[] users);
    event RemoveUsers(address[] users);

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

    /// @notice add new users to the whitelist.
    /// @param _users addresses of users to add
    function addWhitelistedUsers(address[] calldata _users) external auth(MODIFY_WHITELIST) {
        _addWhitelistedUsers(_users);
    }

    /// @dev Internal function to add new users to the whitelist.
    /// @param _users addresses of users to add
    function _addWhitelistedUsers(address[] calldata _users) internal {
        _whitelistUsers(_users, true);

        emit AddUsers(_users);
    }

    /// @notice remove new users to the whitelist.
    /// @param _users addresses of users to remove
    function removeWhitelistedUsers(address[] calldata _users) external auth(MODIFY_WHITELIST) {
        _whitelistUsers(_users, false);

        emit RemoveUsers(_users);
    }

    /// @notice Create a new vote on this concrete implementation
    /// @param _proposalMetadata The IPFS hash pointing to the proposal metadata
    /// @param _actions the actions that will be executed after vote passes
    /// @param _startDate state date of the vote. If 0, uses current timestamp
    /// @param _endDate end date of the vote. If 0, uses _start + minDuration
    /// @param _executeIfDecided Configuration to enable automatic execution on the last required vote
    /// @param _choice Vote choice to cast on creationr
    function newVote(
        bytes calldata _proposalMetadata,
        IDAO.Action[] calldata _actions,
        uint64 _startDate,
        uint64 _endDate,
        bool _executeIfDecided,
        VoterState _choice
    ) external override returns (uint256 voteId) {
        uint64 snapshotBlock = getBlockNumber64() - 1;
        
        if(!isUserWhitelisted(_msgSender(), snapshotBlock)) {
            revert VoteCreationForbidden(_msgSender());
        }
        
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
        vote_.snapshotBlock = snapshotBlock;
        vote_.supportRequiredPct = supportRequiredPct;
        vote_.participationRequiredPct = participationRequiredPct;
        vote_.votingPower = whitelistedUserCount(snapshotBlock);

        unchecked {
            for (uint256 i = 0; i < _actions.length; i++) {
                vote_.actions.push(_actions[i]);
            }
        }

        emit StartVote(voteId, _msgSender(), _proposalMetadata);

        if (_choice != VoterState.None && canVote(voteId, _msgSender())) {
            _vote(voteId, VoterState.Yea, _msgSender(), _executeIfDecided);
        }
    }

    /// @dev Internal function to cast a vote. It assumes the queried vote exists.
    /// @param _voteId voteId
    /// @param _choice Whether voter abstains, supports or not supports to vote.
    /// @param _executesIfDecided if true, and it's the last vote required, immediatelly executes a vote.
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

        emit CastVote(_voteId, _voter, uint8(_choice), 1);

        if (_executesIfDecided && _canExecute(_voteId)) {
            _execute(_voteId);
        }
    }
   
    /**
    *  @dev Tells whether user is whitelisted at specific block or past it.
    *  @param account user address
    *  @param blockNumber block number for which it checks if user is whitelisted
    */
    function isUserWhitelisted(
        address account, 
        uint256 blockNumber
    ) public view returns (bool) {
        if(blockNumber == 0) blockNumber = getBlockNumber64() - 1;
        
        return _checkpoints[account].getAtBlock(blockNumber) == 1;
    }

    /**
    *  @dev returns total count of users that are whitelisted at specific block
    *  @param blockNumber specific block to get count from
    *  @return count of users that are whitelisted blockNumber or prior to it.
    */
    function whitelistedUserCount(
        uint256 blockNumber
    ) public view returns (uint256) {
        if(blockNumber == 0) blockNumber = getBlockNumber64() - 1;
        
        return _totalCheckpoints.getAtBlock(blockNumber);
    }

    /**
     * @dev Internal function to check if a voter can participate on a vote. It assumes the queried vote exists.
     * @param _voteId The voteId
     * @param _voter the address of the voter to check
     * @return True if the given voter can participate a certain vote, false otherwise
     */
    function _canVote(uint256 _voteId, address _voter) internal view override returns (bool) {
        Vote storage vote_ = votes[_voteId];
        return _isVoteOpen(vote_) && isUserWhitelisted(_voter, vote_.snapshotBlock);
    }

    /**
    *  @dev Adds or removes users from whitelist
    *  @param _users user addresses
    *  @param _enabled whether to add or remove from whitelist
    */
    function _whitelistUsers(
        address[] calldata _users, 
        bool _enabled
    ) internal {        
        _totalCheckpoints.push(_enabled ? _add : _sub, _users.length);
        
        for(uint i = 0; i < _users.length; i++) {
            _checkpoints[_users[i]].push(_enabled ? 1 : 0);
        }
    }

    function _add(uint256 a, uint256 b) private pure returns(uint256) {
        unchecked { return a + b; }
    }

    function _sub(uint256 a, uint256 b) private pure returns(uint256) {
        unchecked { return a - b; }
    }
}
