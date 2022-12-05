// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../../core/IDAO.sol";

/// @title IMajorityVoting
/// @author Aragon Association - 2022
/// @notice The interface for majority voting contracts. We use the following definitions:
///     Relative support: `N_yes / (N_yes + N_no)`
///     Total support   : `N_yes / N_total`
interface IMajorityVoting {
    enum VoteOption {
        None,
        Abstain,
        Yes,
        No
    }

    struct Proposal {
        bool executed;
        uint64 startDate;
        uint64 endDate;
        uint64 snapshotBlock;
        uint64 relativeSupportThresholdPct;
        uint64 totalSupportThresholdPct;
        uint256 yes;
        uint256 no;
        uint256 abstain;
        uint256 totalVotingPower;
        mapping(address => VoteOption) voters;
        IDAO.Action[] actions;
    }

    /// @notice Emitted when a vote is cast by a voter.
    /// @param proposalId The ID of the proposal.
    /// @param voter The voter casting the vote.
    /// @param choice The vote option chosen.
    /// @param votingPower The voting power behind this vote.
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        uint8 choice,
        uint256 votingPower
    );

    /// @notice Emitted when a proposal is created.
    /// @param proposalId The ID of the proposal.
    /// @param creator  The creator of the proposal.
    /// @param metadata The IPFS hash pointing to the proposal metadata.
    event ProposalCreated(uint256 indexed proposalId, address indexed creator, bytes metadata);

    /// @notice Emitted when a proposal is executed.
    /// @param proposalId The ID of the proposal.
    /// @param execResults The bytes array resulting from the proposal execution in the associated DAO.
    event ProposalExecuted(uint256 indexed proposalId, bytes[] execResults);

    /// @notice Emitted when the vote settings are updated.
    /// @param relativeSupportThresholdPct The support threshold in percent.
    /// @param totalSupportThresholdPct The total support threshold in percent.
    /// @param minDuration The minimal duration of a vote.
    event VoteSettingsUpdated(
        uint64 totalSupportThresholdPct,
        uint64 relativeSupportThresholdPct,
        uint64 minDuration
    );

    /// @notice Changes the vote settings.
    /// @param _totalSupportThresholdPct The total support threshold in percent.
    /// @param _relativeSupportThresholdPct The relative support threshold in percent.
    /// @param _minDuration The minimal duration of a vote.
    function changeVoteSettings(
        uint64 _relativeSupportThresholdPct,
        uint64 _totalSupportThresholdPct,
        uint64 _minDuration
    ) external;

    /// @notice Creates a new proposal.
    /// @param _proposalMetadata The IPFS hash pointing to the proposal metadata.
    /// @param _actions The actions that will be executed after the proposal passes.
    /// @param _startDate The start date of the vote. If 0, uses current timestamp.
    /// @param _endDate The end date of the vote. If 0, uses `_start` + `minDuration`.
    /// @param _executeIfDecided An option to enable automatic execution on the last required vote.
    /// @param _choice The vote choice to cast on creation.
    /// @return proposalId The ID of the proposal.
    function createProposal(
        bytes calldata _proposalMetadata,
        IDAO.Action[] calldata _actions,
        uint64 _startDate,
        uint64 _endDate,
        bool _executeIfDecided,
        VoteOption _choice
    ) external returns (uint256 proposalId);

    /// @notice Votes for a vote option and optionally executes the proposal.
    /// @dev `[outcome = 1 = abstain], [outcome = 2 = supports], [outcome = 3 = not supports].
    /// @param _proposalId The ID of the proposal.
    /// @param  _choice Whether voter abstains, supports or not supports to vote.
    /// @param _executesIfDecided Whether the proposal actions should be executed if the vote outcome cannot change anymore.
    function vote(
        uint256 _proposalId,
        VoteOption _choice,
        bool _executesIfDecided
    ) external;

    /// @notice Internal function to check if a voter can participate on a proposal vote. This can be because the vote
    /// - has not started,
    /// - has ended,
    /// - was executed, or
    /// - the voter doesn't have voting powers.
    /// @param _proposalId The proposal Id.
    /// @param _voter The address of the voter to check.
    /// @return bool Returns true if the voter is allowed to vote.
    ///@dev The function assumes the queried proposal exists.
    function canVote(uint256 _proposalId, address _voter) external view returns (bool);

    /// @notice Method to execute a proposal if allowed to.
    /// @param _proposalId The ID of the proposal to be executed.
    function execute(uint256 _proposalId) external;

    /// @notice Checks if a proposal is allowed to execute.
    /// @param _proposalId The ID of the proposal to be checked.
    /// @return True if the proposal can be executed, false otherwise.
    function canExecute(uint256 _proposalId) external view returns (bool);

    /// @notice Returns the state of a voter for a given vote by its ID.
    /// @param _proposalId The ID of the proposal.
    /// @return The vote option cast by a voter for a certain proposal.
    function getVoteOption(uint256 _proposalId, address _voter) external view returns (VoteOption);

    /// @notice Returns all information for a proposal by its ID.
    /// @param _proposalId The ID of the proposal.
    /// @return open Wheter the proposal is open or not.
    /// @return executed Wheter the proposal is executed or not.
    /// @return startDate The start date of the proposal.
    /// @return endDate The end date of the proposal.
    /// @return snapshotBlock The block number of the snapshot taken for this proposal.
    /// @return relativeSupportThresholdPct The relative support threshold in percent.
    /// @return totalSupportThresholdPct The total support threshold in percent.
    /// @return totalVotingPower The total number of eligible votes that can be cast.
    /// @return yes The number of `yes` votes.
    /// @return no The number of `no` votes.
    /// @return abstain The number of `abstain` votes.
    /// @return actions The actions to be executed in the associated DAO after the vote has passed.
    function getProposal(uint256 _proposalId)
        external
        view
        returns (
            bool open,
            bool executed,
            uint64 startDate,
            uint64 endDate,
            uint64 snapshotBlock,
            uint64 relativeSupportThresholdPct,
            uint64 totalSupportThresholdPct,
            uint256 totalVotingPower,
            uint256 yes,
            uint256 no,
            uint256 abstain,
            IDAO.Action[] memory actions
        );
}
