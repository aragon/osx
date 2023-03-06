// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {IDAO} from "../../../core/dao/IDAO.sol";

/// @title IMajorityVoting
/// @author Aragon Association - 2022-2023
/// @notice The interface of majority voting plugin.
interface IMajorityVoting {
    /// @notice Vote options that a voter can chose from.
    /// @param None The default option state of a voter indicating the absence of from the vote. This option neither influences support nor participation.
    /// @param Abstain This option does not influence the support but counts towards participation.
    /// @param Yes This option increases the support and counts towards participation.
    /// @param No This option decreases the support and counts towards participation.
    enum VoteOption {
        None,
        Abstain,
        Yes,
        No
    }

    /// @notice Emitted when a vote is cast by a voter.
    /// @param proposalId The ID of the proposal.
    /// @param voter The voter casting the vote.
    /// @param voteOption The casted vote option.
    /// @param votingPower The voting power behind this vote.
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        VoteOption voteOption,
        uint256 votingPower
    );

    /// @notice Returns the support threshold parameter stored in the voting settings.
    /// @return The support threshold parameter.
    function supportThreshold() external view returns (uint32);

    /// @notice Returns the minimum participation parameter stored in the voting settings.
    /// @return The minimum participation parameter.
    function minParticipation() external view returns (uint32);

    /// @notice Checks if the support value defined as $$\texttt{support} = \frac{N_\text{yes}}{N_\text{yes}+N_\text{no}}$$ for a proposal vote is greater than the support threshold.
    /// @param _proposalId The ID of the proposal.
    /// @return Returns `true` if the  support is greater than the support threshold and `false` otherwise.
    function isSupportThresholdReached(uint256 _proposalId) external view returns (bool);

    /// @notice Checks if the worst-case support value defined as $$\texttt{worstCaseSupport} = \frac{N_\text{yes}}{ N_\text{total}-N_\text{abstain}}$$ for a proposal vote is greater than the support threshold.
    /// @param _proposalId The ID of the proposal.
    /// @return Returns `true` if the worst-case support is greater than the support threshold and `false` otherwise.
    function isSupportThresholdReachedEarly(uint256 _proposalId) external view returns (bool);

    /// @notice Checks if the participation value defined as $$\texttt{participation} = \frac{N_\text{yes}+N_\text{no}+N_\text{abstain}}{N_\text{total}}$$ for a proposal vote is greater or equal than the minimum participation value.
    /// @param _proposalId The ID of the proposal.
    /// @return Returns `true` if the participation is greater than the minimum particpation and `false` otherwise.
    function isMinParticipationReached(uint256 _proposalId) external view returns (bool);

    /// @notice Checks if an account can participate on a proposal vote. This can be because the vote
    /// - has not started,
    /// - has ended,
    /// - was executed, or
    /// - the voter doesn't have voting powers.
    /// @param _proposalId The proposal Id.
    /// @param _account The account address to be checked.
    /// @param  _voteOption Whether the voter abstains, supports or opposes the proposal.
    /// @return Returns true if the account is allowed to vote.
    /// @dev The function assumes the queried proposal exists.
    function canVote(
        uint256 _proposalId,
        address _account,
        VoteOption _voteOption
    ) external view returns (bool);

    /// @notice Checks if a proposal can be executed.
    /// @param _proposalId The ID of the proposal to be checked.
    /// @return True if the proposal can be executed, false otherwise.
    function canExecute(uint256 _proposalId) external view returns (bool);

    /// @notice Votes for a vote option and, optionally, executes the proposal.
    /// @dev `_voteOption`, 1 -> abstain, 2 -> yes, 3 -> no
    /// @param _proposalId The ID of the proposal.
    /// @param _voteOption The chosen vote option.
    /// @param _tryEarlyExecution If `true`,  early execution is tried after the vote cast. The call does not revert if early execution is not possible.
    function vote(uint256 _proposalId, VoteOption _voteOption, bool _tryEarlyExecution) external;

    /// @notice Executes a proposal.
    /// @param _proposalId The ID of the proposal to be executed.
    function execute(uint256 _proposalId) external;

    /// @notice Returns whether the account has voted for the proposal.  Note, that this does not check if the account has voting power.
    /// @param _proposalId The ID of the proposal.
    /// @param _account The account address to be checked.
    /// @return The vote option cast by a voter for a certain proposal.
    function getVoteOption(
        uint256 _proposalId,
        address _account
    ) external view returns (VoteOption);
}
