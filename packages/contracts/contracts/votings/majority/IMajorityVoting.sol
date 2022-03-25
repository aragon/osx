/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "./../../core/IDAO.sol";

/// @title The interface for majority voting contracts
/// @author Michael Heuer - Aragon Association - 2022
/// @notice The interface for majority voting contracts
interface IMajorityVoting {
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

    error VoteSupportExceeded(uint64 limit, uint64 actual);
    error VoteParticipationExceeded(uint64 limit, uint64 actual);
    error VoteTimesForbidden(uint64 current, uint64 start, uint64 end, uint64 minDuration);
    error VoteDurationZero();
    error VoteCastForbidden(uint256 voteId, address sender);
    error VoteExecutionForbidden(uint256 voteId);
    error VotePowerZero();

    event StartVote(uint256 indexed voteId, address indexed creator, bytes metadata);
    event CastVote(uint256 indexed voteId, address indexed voter, uint8 voterState, uint256 voterWeight);
    event ExecuteVote(uint256 indexed voteId, bytes[] execResults);
    event UpdateConfig(uint64 participationRequiredPct, uint64 supportRequiredPct, uint64 minDuration);

    /// @notice Change required support and minQuorum
    /// @param _supportRequiredPct New required support
    /// @param _participationRequiredPct New acceptance quorum
    /// @param _minDuration each vote's minimum duration
    function changeVoteConfig(
        uint64 _participationRequiredPct,
        uint64 _supportRequiredPct,
        uint64 _minDuration
    ) external;

    /// @notice Create a new vote on this concrete implementation
    /// @param _proposalMetadata The IPFS hash pointing to the proposal metadata
    /// @param _actions the actions that will be executed after vote passes
    /// @param _startDate state date of the vote. If 0, uses current timestamp
    /// @param _endDate end date of the vote. If 0, uses _start + minDuration
    /// @param _executeIfDecided Configuration to enable automatic execution on the last required vote
    /// @param _choice Vote choice to cast on creation
    /// @return voteId The ID of the vote
    function newVote(
        bytes calldata _proposalMetadata,
        IDAO.Action[] calldata _actions,
        uint64 _startDate,
        uint64 _endDate,
        bool _executeIfDecided,
        VoterState _choice
    ) external returns (uint256 voteId);

    /// @notice Vote `[outcome = 1 = abstain], [outcome = 2 = supports], [outcome = 1 = not supports]
    /// @param _voteId Id for vote
    /// @param  _choice Whether voter abstains, supports or not supports to vote.
    /// @param _executesIfDecided Whether the vote should execute its action if it becomes decided
    function vote(
        uint256 _voteId,
        VoterState _choice,
        bool _executesIfDecided
    ) external;

    /// @dev Internal function to check if a voter can participate on a vote. It assumes the queried vote exists.
    /// @param _voteId the vote Id
    /// @param _voter the address of the voter to check
    /// @return bool true if user is allowed to vote
    function canVote(uint256 _voteId, address _voter) external view returns (bool);

    /// @dev Method to execute a vote if allowed to
    /// @param _voteId The ID of the vote to execute
    function execute(uint256 _voteId) external;

    /// @dev Method to execute a vote if allowed to
    /// @param _voteId The ID of the vote to execute
    function canExecute(uint256 _voteId) external view returns (bool);

    /// @dev Return the state of a voter for a given vote by its ID
    /// @param _voteId The ID of the vote
    /// @return VoterState of the requested voter for a certain vote
    function getVoterState(uint256 _voteId, address _voter) external view returns (VoterState);

    /// @dev Return all information for a vote by its ID
    /// @param _voteId Vote id
    /// @return open Vote open status
    /// @return executed Vote executed status
    /// @return startDate start date
    /// @return endDate end date
    /// @return snapshotBlock The block number of the snapshot taken for this vote
    /// @return supportRequired support required
    /// @return participationRequired minimum participation required
    /// @return votingPower power
    /// @return yea yeas amount
    /// @return nay nays amount
    /// @return abstain abstain amount
    /// @return actions Actions
    function getVote(uint256 _voteId)
        external
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
        );
}
