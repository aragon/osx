// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../../core/IDAO.sol";

/// @title IMajorityVoting
/// @author Aragon Association - 2022
/// @notice The interface of majority voting plugin.
///
///  #### Parameterization
///  We define two parameters
///  $$\texttt{support} = \frac{N_\text{yes}}{N_\text{yes}+N_\text{no}}$$
///  and
///  $$\texttt{participation} = \frac{N_\text{yes}+N_\text{no}+N_\text{abstain}}{N_\text{total}}$$
///  where $N_\text{yes}$, $N_\text{no}$, and $N_\text{abstain}$ are the yes, no, and abstain votes that have been casted and $N_\text{total}$ is the total voting power available at proposal creation time.
///  Majority voting implies that the support threshold is set with
///  $$\texttt{supportThreshold} \ge 50\% .$$
///  However, this is not enforced by the contract code and developers can make unsafe configurations and only the frontend will warn about bad parameter settings.
///
///  #### Vote Replacement Execution
///  The contract allows votes to be replaced. Voters can vote multiple times and only the latest choice is tallied.
///
///  #### Early Execution
///  This contract allows a proposal to be executed early, iff the vote outcome cannot change anymore by more people voting. Accordingly, vote replacement and early execution are mutually exclusive options.
///  $$\texttt{remainingVotes} = N_\text{total}-\underbrace{(N_\text{yes}+N_\text{no}+N_\text{abstain})}_{\text{turnout}}$$
///  We use this quantity to calculate the worst case support that would be obtained if all remaining votes are casted with no:
///  $$\begin{align*}
///    \texttt{worstCaseSupport}
///    &= \frac{N_\text{yes}}{N_\text{yes}+(N_\text{no} + \texttt{remainingVotes})}
///    \\[3mm]
///    &= \frac{N_\text{yes}}{N_\text{yes}+N_\text{no} + N_\text{total}-(N_\text{yes}+N_\text{no}+N_\text{abstain})}
///    \\[3mm]
///    &= \frac{N_\text{yes}}{ N_\text{total}-N_\text{abstain}}
///  \end{align*}$$
///  Accordingly, early execution is possible when the vote is open, the support threshold
///  $$\texttt{worstCaseSupport} > \texttt{supportThreshold}$$,
///  and the minimum participation
///  $$\texttt{participation} \ge \texttt{minParticipation}$$
///  are met.
///  #### Threshold vs. Minimum
///  For threshold values, $>$ comparison is used. This **does not** include the threshold value. E.g., for $\texttt{supportThreshold} = 50\%$, the criterion is fulfilled if there is at least one more yes than no votes ($N_\text{yes} = N_\text{no}+1$).
///  For minimal values, $\ge$ comparison is used. This **does** include the minimum participation value. E.g., for $\texttt{minParticipation} = 40\%$ and $N_\text{total} = 10$, the criterion is fulfilled if 4 out of 10 votes were casted.
/// @dev This contract implements the `IMajorityVoting` interface.
interface IMajorityVoting {
    enum VoteOption {
        None,
        Abstain,
        Yes,
        No
    }

    struct PluginSettings {
        bool earlyExecution;
        bool voteReplacement;
        uint64 supportThreshold;
        uint64 minParticipation;
        uint64 minDuration;
        uint256 minProposerVotingPower;
    }

    struct Configuration {
        bool earlyExecution;
        bool voteReplacement;
        uint64 supportThreshold;
        uint64 minParticipation;
        uint64 startDate;
        uint64 endDate;
        uint64 snapshotBlock;
    }

    struct Tally {
        uint256 abstain;
        uint256 yes;
        uint256 no;
        uint256 totalVotingPower;
    }

    struct Proposal {
        bool executed;
        Configuration configuration;
        Tally tally;
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

    /// @notice Emitted when the plugin settings are updated.
    /// @param earlyExecution The toggle to enable early execution. This allows proposals to be executed before the end date, if the vote outcome cannot change by more voters participating.
    /// @param voteReplacement The toggle to enable vote replacement. This allows voters to change there vote choice as long as the vote is still open. Note, that this is mutally exclusive with the early execution.
    /// @param supportThreshold The support threshold value.
    /// @param minParticipation The minimum participation value.
    /// @param minDuration The minimum duration of the proposal vote in seconds.
    /// @param minProposerVotingPower The minimum voting power required to create a proposal.
    event PluginSettingsUpdated(
        bool earlyExecution,
        bool voteReplacement,
        uint64 supportThreshold,
        uint64 minParticipation,
        uint64 minDuration,
        uint256 minProposerVotingPower
    );

    /// @notice Sets the plugin settings.
    /// @param _pluginSettings The new plugin settings.
    function setPluginSettings(PluginSettings calldata _pluginSettings) external;

    /// @notice Creates a new proposal.
    /// @param _proposalMetadata The IPFS hash pointing to the proposal metadata.
    /// @param _actions The actions that will be executed after the proposal passes.
    /// @param _startDate The start date of the proposal vote. If 0, the current timestamp is used and the vote starts immediately.
    /// @param _endDate The end date of the proposal vote. If 0, `_startDate + minDuration` is used.
    /// @param _tryEarlyExecution If `true`,  early execution is tried after the vote cast. The call does not revert if early execution is not possible.
    /// @param _choice The vote choice to cast on creation.
    /// @return proposalId The ID of the proposal.
    function createProposal(
        bytes calldata _proposalMetadata,
        IDAO.Action[] calldata _actions,
        uint64 _startDate,
        uint64 _endDate,
        bool _tryEarlyExecution,
        VoteOption _choice
    ) external returns (uint256 proposalId);

    /// @notice Votes for a vote option and optionally executes the proposal.
    /// @dev `_choice`, 1 -> abstain, 2 -> yes, 3 -> no
    /// @param _proposalId The ID of the proposal.
    /// @param  _choice Whether voter abstains, supports or not supports to vote.
    /// @param _tryEarlyExecution If `true`,  early execution is tried after the vote cast. The call does not revert if early execution is not possible.
    function vote(
        uint256 _proposalId,
        VoteOption _choice,
        bool _tryEarlyExecution
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

    /// @notice Executes a proposal.
    /// @param _proposalId The ID of the proposal to be executed.
    function execute(uint256 _proposalId) external;

    /// @notice Checks if a proposal can be executed.
    /// @param _proposalId The ID of the proposal to be checked.
    /// @return True if the proposal can be executed, false otherwise.
    function canExecute(uint256 _proposalId) external view returns (bool);

    /// @notice Returns the vote option stored for a voter for a proposal vote.
    /// @param _proposalId The ID of the proposal.
    /// @return The vote option cast by a voter for a certain proposal.
    function getVoteOption(uint256 _proposalId, address _voter) external view returns (VoteOption);

    /// @notice Returns the support value defined as $$\texttt{support} = \frac{N_\text{yes}}{N_\text{yes}+N_\text{no}}$$ for a proposal vote.
    /// @param _proposalId The ID of the proposal.
    /// @return The support value.
    function support(uint256 _proposalId) external view returns (uint256);

    /// @notice Returns the worst case support value defined as $$\texttt{worstCaseSupport} = \frac{N_\text{yes}}{ N_\text{total}-N_\text{abstain}}$$ for a proposal vote.
    /// @param _proposalId The ID of the proposal.
    /// @return The worst case support value.
    function worstCaseSupport(uint256 _proposalId) external view returns (uint256);

    /// @notice Returns the participation value defined as $$\texttt{participation} = \frac{N_\text{yes}+N_\text{no}+N_\text{abstain}}{N_\text{total}}$$ for a proposal vote.
    /// @param _proposalId The ID of the proposal.
    /// @return The participation value.
    function participation(uint256 _proposalId) external view returns (uint256);

    /// @notice Returns the early exeucution parameter stored in the vote settings.
    /// @return The early execution parameter.
    function earlyExecution() external view returns (bool);

    /// @notice Returns the vote replacement parameter stored in the vote settings.
    /// @return The vote replacement parameter.
    function voteReplacement() external view returns (bool);

    /// @notice Returns the support threshold parameter stored in the vote settings.
    /// @return The support threshold parameter.
    function supportThreshold() external view returns (uint64);

    /// @notice Returns the minimum participation parameter stored in the vote settings.
    /// @return The minimum participation parameter.
    function minParticipation() external view returns (uint64);

    /// @notice Returns the minimum duration parameter stored in the vote settings.
    /// @return The minimum duration parameter.
    function minDuration() external view returns (uint64);

    /// @notice Returns the minimum voting power required to create a proposa stored in the vote settings.
    /// @return The minimum voting power required to create a proposal.
    function minProposerVotingPower() external view returns (uint256);

    /// @notice Returns all information for a proposal vote by its ID.
    /// @param _proposalId The ID of the proposal.
    /// @return open Wheter the proposal is open or not.
    /// @return executed Wheter the proposal is executed or not.
    /// @return configuration The configuration of the proposal vote.
    /// @return tally The current tally of the proposal vote.
    /// @return actions The actions to be executed in the associated DAO after the proposal has passed.
    function getProposal(uint256 _proposalId)
        external
        view
        returns (
            bool open,
            bool executed,
            Configuration memory configuration,
            Tally memory tally,
            IDAO.Action[] memory actions
        );
}
