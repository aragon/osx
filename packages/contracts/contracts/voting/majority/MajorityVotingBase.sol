// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {TimeHelpers} from "../../utils/TimeHelpers.sol";
import {PluginUUPSUpgradeable} from "../../core/plugin/PluginUUPSUpgradeable.sol";
import {IDAO} from "../../core/IDAO.sol";
import {IMajorityVoting} from "../majority/IMajorityVoting.sol";

/// @title MajorityVotingBase
/// @author Aragon Association - 2022
/// @notice The abstract implementation of majority voting plugins.
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
///  The contract allows votes to be replaced. Voters can vote multiple times and only the latest voteOption is tallied.
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
abstract contract MajorityVotingBase is
    IMajorityVoting,
    Initializable,
    ERC165Upgradeable,
    TimeHelpers,
    PluginUUPSUpgradeable
{
    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 internal constant MAJORITY_VOTING_INTERFACE_ID = type(IMajorityVoting).interfaceId;

    /// @notice The ID of the permission required to call the `updatePluginSettings` function.
    bytes32 public constant UPDATE_PLUGIN_SETTINGS_PERMISSION_ID =
        keccak256("SET_PLUGIN_SETTINGS_PERMISSION");

    /// @notice The base value being defined to correspond to 100% to calculate and compare percentages despite the lack of floating point arithmetic.
    uint64 public constant PCT_BASE = 10**18; // 0% = 0; 1% = 10^16; 100% = 10^18

    /// @notice A mapping between proposal IDs and proposal information.
    mapping(uint256 => Proposal) internal proposals;

    /// @notice The struct storing the plugin settings.
    PluginSettings private pluginSettings;

    /// @notice A counter counting the created proposals.
    uint256 public proposalCount;

    /// @notice Thrown if a specified percentage value exceeds the limit (100% = 10^18).
    /// @param limit The maximal value.
    /// @param actual The actual value.
    error PercentageExceeds100(uint64 limit, uint64 actual);

    /// @notice Thrown if a date is out of bounds.
    /// @param limit The limit value.
    /// @param actual The actual value.
    error DateOutOfBounds(uint64 limit, uint64 actual);

    /// @notice Thrown if the minimal duration value is out of bounds.
    /// @param limit The limit value.
    /// @param actual The actual value.
    error MinDurationOutOfBounds(uint64 limit, uint64 actual);

    /// @notice Thrown when a sender is not allowed to create a vote.
    /// @param sender The sender address.
    error ProposalCreationForbidden(address sender);

    /// @notice Thrown if zero is not allowed as a value
    error ZeroValueNotAllowed();

    /// @notice Thrown if both, early execution and vote replacement, are selected.
    error VoteReplacementNotAllowed();

    /// @notice Thrown if a voter is not allowed to cast a vote. This can be because the vote
    /// - has not started,
    /// - has ended,
    /// - was executed, or
    /// - the voter doesn't have voting powers.
    /// @param proposalId The ID of the proposal.
    /// @param sender The address of the voter.
    error VoteCastForbidden(uint256 proposalId, address sender);

    /// @notice Thrown if the proposal execution is forbidden.
    /// @param proposalId The ID of the proposal.
    error ProposalExecutionForbidden(uint256 proposalId);

    /// @notice Initializes the component to be used by inheriting contracts.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The IDAO interface of the associated DAO.
    /// @param _pluginSettings The plugin settings.
    function __MajorityVotingBase_init(IDAO _dao, PluginSettings calldata _pluginSettings)
        internal
        onlyInitializing
    {
        __PluginUUPSUpgradeable_init(_dao);
        _validateAndUpdateSettings(_pluginSettings);
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param interfaceId The ID of the interace.
    /// @return bool Returns true if the interface is supported.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC165Upgradeable, PluginUUPSUpgradeable)
        returns (bool)
    {
        return interfaceId == MAJORITY_VOTING_INTERFACE_ID || super.supportsInterface(interfaceId);
    }

    /// @inheritdoc IMajorityVoting
    function updatePluginSettings(PluginSettings calldata _pluginSettings)
        external
        auth(UPDATE_PLUGIN_SETTINGS_PERMISSION_ID)
    {
        _validateAndUpdateSettings(_pluginSettings);
    }

    /// @inheritdoc IMajorityVoting
    function createProposal(
        bytes calldata _proposalMetadata,
        IDAO.Action[] calldata _actions,
        uint64 _startDate,
        uint64 _endDate,
        bool _tryEarlyExecution,
        VoteOption _voteOption
    ) external virtual returns (uint256 proposalId);

    /// @inheritdoc IMajorityVoting
    function vote(
        uint256 _proposalId,
        VoteOption _voteOption,
        bool _tryEarlyExecution
    ) public {
        if (_voteOption != VoteOption.None && !_canVote(_proposalId, _msgSender())) {
            revert VoteCastForbidden(_proposalId, _msgSender());
        }
        _vote(_proposalId, _voteOption, _msgSender(), _tryEarlyExecution);
    }

    /// @inheritdoc IMajorityVoting
    function execute(uint256 _proposalId) public {
        if (!_canExecute(_proposalId)) revert ProposalExecutionForbidden(_proposalId);
        _execute(_proposalId);
    }

    /// @inheritdoc IMajorityVoting
    function getVoteOption(uint256 _proposalId, address _voter) public view returns (VoteOption) {
        return proposals[_proposalId].voters[_voter];
    }

    /// @inheritdoc IMajorityVoting
    function canVote(uint256 _proposalId, address _voter) public view returns (bool) {
        return _canVote(_proposalId, _voter);
    }

    /// @inheritdoc IMajorityVoting
    function canExecute(uint256 _proposalId) public view returns (bool) {
        return _canExecute(_proposalId);
    }

    /// @inheritdoc IMajorityVoting
    function support(uint256 _proposalId) public view virtual returns (uint256) {
        Proposal storage proposal_ = proposals[_proposalId];

        return _calculatePct(proposal_.tally.yes, proposal_.tally.yes + proposal_.tally.no);
    }

    /// @inheritdoc IMajorityVoting
    function worstCaseSupport(uint256 _proposalId) public view virtual returns (uint256) {
        Proposal storage proposal_ = proposals[_proposalId];

        return
            _calculatePct(
                proposal_.tally.yes,
                proposal_.tally.totalVotingPower - proposal_.tally.abstain
            );
    }

    /// @inheritdoc IMajorityVoting
    function participation(uint256 _proposalId) public view virtual returns (uint256) {
        Proposal storage proposal_ = proposals[_proposalId];

        return
            _calculatePct(
                proposal_.tally.yes + proposal_.tally.no + proposal_.tally.abstain,
                proposal_.tally.totalVotingPower
            );
    }

    /// @inheritdoc IMajorityVoting
    function supportThreshold() public view returns (uint64) {
        return pluginSettings.supportThreshold;
    }

    /// @inheritdoc IMajorityVoting
    function minParticipation() public view returns (uint64) {
        return pluginSettings.minParticipation;
    }

    /// @inheritdoc IMajorityVoting
    function minDuration() public view returns (uint64) {
        return pluginSettings.minDuration;
    }

    /// @inheritdoc IMajorityVoting
    function minProposerVotingPower() public view returns (uint256) {
        return pluginSettings.minProposerVotingPower;
    }

    /// @inheritdoc IMajorityVoting
    function voteMode() public view returns (VoteMode) {
        return pluginSettings.voteMode;
    }

    /// @inheritdoc IMajorityVoting
    function getProposal(uint256 _proposalId)
        public
        view
        returns (
            bool open,
            bool executed,
            Configuration memory configuration,
            Tally memory tally,
            IDAO.Action[] memory actions
        )
    {
        Proposal storage proposal_ = proposals[_proposalId];

        open = _isVoteOpen(proposal_);
        executed = proposal_.executed;
        configuration = proposal_.configuration;
        tally = proposal_.tally;
        actions = proposal_.actions;
    }

    /// @notice Internal function to cast a vote. It assumes the queried vote exists.
    /// @param _proposalId The ID of the proposal.
    /// @param _voteOption Whether voter abstains, supports or not supports to vote.
    /// @param _tryEarlyExecution If `true`,  early execution is tried after the vote cast. The call does not revert if early execution is not possible.
    function _vote(
        uint256 _proposalId,
        VoteOption _voteOption,
        address _voter,
        bool _tryEarlyExecution
    ) internal virtual;

    /// @notice Internal function to execute a vote. It assumes the queried proposal exists.
    /// @param _proposalId The ID of the proposal.
    function _execute(uint256 _proposalId) internal virtual {
        proposals[_proposalId].executed = true;

        bytes[] memory execResults = dao.execute(_proposalId, proposals[_proposalId].actions);

        emit ProposalExecuted({proposalId: _proposalId, execResults: execResults});
    }

    /// @notice Internal function to check if a voter can vote. It assumes the queried proposal exists.
    /// @param _proposalId The ID of the proposal.
    /// @param _voter The address of the voter to check.
    /// @return Returns `true` if the given voter can vote on a certain proposal and `false` otherwise.
    function _canVote(uint256 _proposalId, address _voter) internal view virtual returns (bool);

    /// @notice Internal function to check if a proposal can be executed. It assumes the queried proposal exists.
    /// @param _proposalId The ID of the proposal.
    /// @return True if the proposal can be executed, false otherwise.
    /// @dev Threshold and minimal values are compared with `>` and `>=` comparators, respectively.
    function _canExecute(uint256 _proposalId) internal view virtual returns (bool) {
        Proposal storage proposal_ = proposals[_proposalId];

        // Verify that the vote has not been executed already.
        if (proposal_.executed) {
            return false;
        }

        if (_isVoteOpen(proposal_)) {
            // Early execution
            return
                proposal_.configuration.voteMode == VoteMode.EarlyExecution &&
                worstCaseSupport(_proposalId) > proposal_.configuration.supportThreshold &&
                participation(_proposalId) >= proposal_.configuration.minParticipation;
        } else {
            // Normal execution
            return
                support(_proposalId) > proposal_.configuration.supportThreshold &&
                participation(_proposalId) >= proposal_.configuration.minParticipation;
        }
    }

    /// @notice Internal function to check if a proposal vote is still open.
    /// @param proposal_ The proposal struct.
    /// @return True if the proposal vote is open, false otherwise.
    function _isVoteOpen(Proposal storage proposal_) internal view virtual returns (bool) {
        uint64 currentTime = getTimestamp64();

        return
            proposal_.configuration.startDate <= currentTime &&
            currentTime < proposal_.configuration.endDate &&
            !proposal_.executed;
    }

    /// @notice Calculates the relative of a value with respect to a total as a percentage.
    /// @param _value The value.
    /// @param _total The total.
    /// @return returns The relative value as a percentage.
    function _calculatePct(uint256 _value, uint256 _total) internal pure returns (uint256) {
        if (_total == 0) {
            revert ZeroValueNotAllowed();
        }

        return (_value * PCT_BASE) / _total;
    }

    /// @notice Validates and updates the proposal plugin settings.
    /// @param _pluginSettings The plugin settings to be validated and updated.
    function _validateAndUpdateSettings(PluginSettings calldata _pluginSettings) internal virtual {
        if (_pluginSettings.supportThreshold > PCT_BASE) {
            revert PercentageExceeds100({
                limit: PCT_BASE,
                actual: _pluginSettings.supportThreshold
            });
        }

        if (_pluginSettings.minParticipation > PCT_BASE) {
            revert PercentageExceeds100({
                limit: PCT_BASE,
                actual: _pluginSettings.minParticipation
            });
        }

        if (_pluginSettings.minDuration < 60 minutes) {
            revert MinDurationOutOfBounds({limit: 60 minutes, actual: _pluginSettings.minDuration});
        }

        if (_pluginSettings.minDuration > 365 days) {
            revert MinDurationOutOfBounds({limit: 365 days, actual: _pluginSettings.minDuration});
        }

        pluginSettings = _pluginSettings;

        emit PluginSettingsUpdated({
            voteMode: _pluginSettings.voteMode,
            supportThreshold: _pluginSettings.supportThreshold,
            minParticipation: _pluginSettings.minParticipation,
            minDuration: _pluginSettings.minDuration,
            minProposerVotingPower: _pluginSettings.minProposerVotingPower
        });
    }

    /// @notice Validates and returns the proposal vote dates.
    /// @param _start The start date of the proposal vote. If 0, the current timestamp is used and the vote starts immediately.
    /// @param _end The end date of the proposal vote. If 0, `_start + minDuration` is used.
    /// @return startDate The validated start date of the proposal vote.
    /// @return endDate The validated end date of the proposal vote.
    function _validateProposalDates(uint64 _start, uint64 _end)
        internal
        view
        virtual
        returns (uint64 startDate, uint64 endDate)
    {
        uint64 currentTimestamp = getTimestamp64();

        if (_start == 0) {
            startDate = currentTimestamp;
        } else {
            startDate = _start;

            if (startDate < currentTimestamp) {
                revert DateOutOfBounds({limit: currentTimestamp, actual: startDate});
            }
        }

        uint64 earliestEndDate = startDate + pluginSettings.minDuration; // Since `minDuration` is limited to 1 year, `startDate + minDuration` can only overflow if the `startDate` is after `type(uint64).max - minDuration`. In this case, the proposal creation will revert and another date can be picked.

        if (_end == 0) {
            endDate = earliestEndDate;
        } else {
            endDate = _end;

            if (endDate < earliestEndDate) {
                revert DateOutOfBounds({limit: earliestEndDate, actual: endDate});
            }
        }
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[46] private __gap;
}
