// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {TimeHelpers} from "../../utils/TimeHelpers.sol";
import {IMajorityVoting} from "./IMajorityVoting.sol";
import {PluginUUPSUpgradeable} from "../../core/plugin/PluginUUPSUpgradeable.sol";
import {IDAO} from "../../core/IDAO.sol";

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
///  Accordingly, early execution is possible when the vote is open and the two thresholds
///  $$\texttt{worstCaseSupport} > \texttt{supportThreshold}$$
///  and
///  $$\texttt{participation} > \texttt{participationThreshold}$$
///  are met.
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

    /// @notice The ID of the permission required to call the `changeVoteSettings` function.
    bytes32 public constant CHANGE_VOTE_SETTINGS_PERMISSION_ID =
        keccak256("CHANGE_VOTE_SETTINGS_PERMISSION");

    /// @notice The base value being defined to correspond to 100% to calculate and compare percentages despite the lack of floating point arithmetic.
    uint64 public constant PCT_BASE = 10**18; // 0% = 0; 1% = 10^16; 100% = 10^18

    /// @notice A mapping between proposal IDs and proposal information.
    mapping(uint256 => Proposal) internal proposals;

    //TODO put in a struct named VoteSettings, later add earlyExecutionAllowed
    uint64 public supportThreshold;
    uint64 public participationThreshold;
    uint64 public minDuration;

    uint256 public proposalCount;

    /// @notice Thrown if a specified percentage value exceeds the limit (100% = 10^18).
    /// @param limit The maximal value.
    /// @param actual The actual value.
    error PercentageExceeds100(uint64 limit, uint64 actual);

    /// @notice Thrown if the selected vote times are not allowed.
    /// @param current The maximal value.
    /// @param start The start date of the vote as a unix timestamp.
    /// @param end The end date of the vote as a unix timestamp.
    /// @param minDuration The minimal duration of the vote in seconds.
    error VotingPeriodInvalid(uint64 current, uint64 start, uint64 end, uint64 minDuration);

    /// @notice Thrown if the selected vote duration is zero
    error VoteDurationZero(); ///TODO  remove

    /// @notice Thrown if zero is not allowed as a value
    error ZeroValueNotAllowed();

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
    /// @param _participationThreshold The participation threshold in percent.
    /// @param _supportThreshold The support threshold in percent.
    /// @param _minDuration The minimal duration of a vote
    function __MajorityVotingBase_init(
        IDAO _dao,
        uint64 _participationThreshold,
        uint64 _supportThreshold,
        uint64 _minDuration
    ) internal onlyInitializing {
        __PluginUUPSUpgradeable_init(_dao);

        _validateAndSetSettings(_participationThreshold, _supportThreshold, _minDuration);

        emit VoteSettingsUpdated(_participationThreshold, _supportThreshold, _minDuration);
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
    function changeVoteSettings(
        uint64 _participationThreshold,
        uint64 _supportThreshold,
        uint64 _minDuration
    ) external auth(CHANGE_VOTE_SETTINGS_PERMISSION_ID) {
        _validateAndSetSettings(_participationThreshold, _supportThreshold, _minDuration);

        emit VoteSettingsUpdated(_participationThreshold, _supportThreshold, _minDuration);
    }

    /// @inheritdoc IMajorityVoting
    function createProposal(
        bytes calldata _proposalMetadata,
        IDAO.Action[] calldata _actions,
        uint64 _startDate,
        uint64 _endDate,
        bool _executeIfDecided,
        VoteOption _choice
    ) external virtual returns (uint256 proposalId);

    /// @inheritdoc IMajorityVoting
    function vote(
        uint256 _proposalId,
        VoteOption _choice,
        bool _executesIfDecided
    ) public {
        if (_choice != VoteOption.None && !_canVote(_proposalId, _msgSender())) {
            revert VoteCastForbidden(_proposalId, _msgSender());
        }
        _vote(_proposalId, _choice, _msgSender(), _executesIfDecided);
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
    function support(uint256 _proposalId) public view returns (uint256) {
        Proposal storage proposal_ = proposals[_proposalId];

        return _calculatePct(proposal_.yes, proposal_.yes + proposal_.no);
    }

    /// @inheritdoc IMajorityVoting
    function worstCaseSupport(uint256 _proposalId) public view returns (uint256) {
        Proposal storage proposal_ = proposals[_proposalId];

        return _calculatePct(proposal_.yes, proposal_.totalVotingPower - proposal_.abstain);
    }

    /// @inheritdoc IMajorityVoting
    function participation(uint256 _proposalId) public view returns (uint256) {
        Proposal storage proposal_ = proposals[_proposalId];

        return
            _calculatePct(
                proposal_.yes + proposal_.no + proposal_.abstain,
                proposal_.totalVotingPower
            );
    }

    /// @inheritdoc IMajorityVoting
    function getProposal(uint256 _proposalId)
        public
        view
        returns (
            bool open,
            bool executed,
            uint64 startDate,
            uint64 endDate,
            uint64 snapshotBlock,
            uint64 _supportThreshold,
            uint64 _participationThreshold,
            uint256 totalVotingPower,
            uint256 yes,
            uint256 no,
            uint256 abstain,
            IDAO.Action[] memory actions
        )
    {
        Proposal storage proposal_ = proposals[_proposalId];

        open = _isVoteOpen(proposal_);
        executed = proposal_.executed;
        startDate = proposal_.startDate;
        endDate = proposal_.endDate;
        snapshotBlock = proposal_.snapshotBlock;
        _supportThreshold = proposal_.supportThreshold;
        _participationThreshold = proposal_.participationThreshold;
        totalVotingPower = proposal_.totalVotingPower;
        yes = proposal_.yes;
        no = proposal_.no;
        abstain = proposal_.abstain;
        actions = proposal_.actions;
    }

    /// @notice Internal function to cast a vote. It assumes the queried vote exists.
    /// @param _proposalId The ID of the proposal.
    /// @param _choice Whether voter abstains, supports or not supports to vote.
    /// @param _executesIfDecided if true, and it's the last vote required, immediately executes a vote.
    function _vote(
        uint256 _proposalId,
        VoteOption _choice,
        address _voter,
        bool _executesIfDecided
    ) internal virtual;

    /// @notice Internal function to execute a vote. It assumes the queried proposal exists.
    /// @param _proposalId The ID of the proposal.
    function _execute(uint256 _proposalId) internal virtual {
        proposals[_proposalId].executed = true;

        bytes[] memory execResults = dao.execute(_proposalId, proposals[_proposalId].actions);

        emit ProposalExecuted(_proposalId, execResults);
    }

    /// @notice Internal function to check if a voter can vote. It assumes the queried proposal exists.
    /// @param _proposalId The ID of the proposal.
    /// @param _voter The address of the voter to check.
    /// @return True if the given voter can vote on a certain proposal, false otherwise.
    function _canVote(uint256 _proposalId, address _voter) internal view virtual returns (bool);

    /// @notice Internal function to check if a proposal can be executed. It assumes the queried proposal exists.
    /// @param _proposalId The ID of the proposal.
    /// @return True if the proposal can be executed, false otherwise.
    function _canExecute(uint256 _proposalId) internal view virtual returns (bool) {
        Proposal storage proposal_ = proposals[_proposalId];

        // Verify that the vote has not been executed already.
        if (proposal_.executed) {
            return false;
        }

        if (_isVoteOpen(proposal_)) {
            // Early execution
            return
                worstCaseSupport(_proposalId) > proposal_.supportThreshold &&
                participation(_proposalId) > proposal_.participationThreshold;
        } else {
            // Normal execution
            return
                support(_proposalId) > proposal_.supportThreshold &&
                participation(_proposalId) > proposal_.participationThreshold;
        }
    }

    /// @notice Internal function to check if a proposal vote is still open.
    /// @param proposal_ The proposal struct.
    /// @return True if the proposal vote is open, false otherwise.
    function _isVoteOpen(Proposal storage proposal_) internal view virtual returns (bool) {
        return
            getTimestamp64() < proposal_.endDate &&
            getTimestamp64() >= proposal_.startDate &&
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

    function _validateAndSetSettings(
        uint64 _participationThreshold,
        uint64 _supportThreshold,
        uint64 _minDuration
    ) internal virtual {
        if (_supportThreshold > PCT_BASE) {
            revert PercentageExceeds100({limit: PCT_BASE, actual: _supportThreshold});
        }

        if (_participationThreshold > PCT_BASE) {
            revert PercentageExceeds100({limit: PCT_BASE, actual: _participationThreshold});
        }

        if (_minDuration == 0) {
            revert VoteDurationZero();
        }

        participationThreshold = _participationThreshold;
        supportThreshold = _supportThreshold;
        minDuration = _minDuration;
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[47] private __gap;
}
