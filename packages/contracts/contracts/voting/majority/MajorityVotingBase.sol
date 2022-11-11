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
/// @notice The abstract implementation of majority voting plugin. We use the following definitions:
/// - Relative support: `N_yes / (N_yes + N_no)`
/// - Total support   : `N_yes/ N_total`
/// Additionally, the following assumptions apply to the threshold paramters related to the above mentioned quantities:
/// - `relativeSupportThresholdPct` >= 50 %
/// - `totalSupportThresholdPct` <= `relativeSupportThresholdPct`
/// These constraints are not enforeced by contract code and developers can make unsafe configurations. Instead, the frontend will warn about wrong parameter settings.
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

    /// @notice The ID of the permission required to call the `setConfiguration` function.
    bytes32 public constant SET_CONFIGURATION_PERMISSION_ID =
        keccak256("SET_CONFIGURATION_PERMISSION");

    /// @notice The base value being defined to correspond to 100% to calculate and compare percentages despite the lack of floating point arithmetic.
    uint64 public constant PCT_BASE = 10**18; // 0% = 0; 1% = 10^16; 100% = 10^18

    /// @notice A mapping between vote IDs and vote information.
    mapping(uint256 => Vote) internal votes;

    uint64 public relativeSupportThresholdPct;
    uint64 public totalSupportThresholdPct;
    uint64 public minDuration;
    uint256 public votesLength;

    /// @notice Thrown if a specified percentage value exceeds the limit (100% = 10^18).
    /// @param limit The maximal value.
    /// @param actual The actual value.
    error PercentageExceeds100(uint64 limit, uint64 actual);

    /// @notice Thrown if the selected vote times are not allowed.
    /// @param current The maximal value.
    /// @param start The start date of the vote as a unix timestamp.
    /// @param end The end date of the vote as a unix timestamp.
    /// @param minDuration The minimal duration of the vote in seconds.
    error VoteTimesInvalid(uint64 current, uint64 start, uint64 end, uint64 minDuration);

    /// @notice Thrown if the selected vote duration is zero
    error VoteDurationZero(); ///TODO  remove

    /// @notice Thrown if zero is not allowed as a value
    error ZeroValueNotAllowed();

    /// @notice Thrown if a voter is not allowed to cast a vote. This can be because the vote
    /// - has not started,
    /// - has ended,
    /// - was executed, or
    /// - the voter doesn't have voting powers.
    /// @param voteId The ID of the vote.
    /// @param sender The address of the voter.
    error VoteCastForbidden(uint256 voteId, address sender);

    /// @notice Thrown if the vote execution is forbidden.
    /// @param voteId The ID of the vote.
    error VoteExecutionForbidden(uint256 voteId);

    /// @notice Initializes the component to be used by inheriting contracts.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The IDAO interface of the associated DAO.
    /// @param _totalSupportThresholdPct The total support threshold in percent.
    /// @param _relativeSupportThresholdPct The relative support threshold in percent.
    /// @param _minDuration The minimal duration of a vote
    function __MajorityVotingBase_init(
        IDAO _dao,
        uint64 _totalSupportThresholdPct,
        uint64 _relativeSupportThresholdPct,
        uint64 _minDuration
    ) internal onlyInitializing {
        __PluginUUPSUpgradeable_init(_dao);

        _validateAndSetSettings(
            _totalSupportThresholdPct,
            _relativeSupportThresholdPct,
            _minDuration
        );

        emit ConfigUpdated(_totalSupportThresholdPct, _relativeSupportThresholdPct, _minDuration);
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
    function setConfiguration(
        uint64 _totalSupportThresholdPct,
        uint64 _relativeSupportThresholdPct,
        uint64 _minDuration
    ) external auth(SET_CONFIGURATION_PERMISSION_ID) {
        _validateAndSetSettings(
            _totalSupportThresholdPct,
            _relativeSupportThresholdPct,
            _minDuration
        );

        emit ConfigUpdated(_totalSupportThresholdPct, _relativeSupportThresholdPct, _minDuration);
    }

    /// @inheritdoc IMajorityVoting
    function createVote(
        bytes calldata _proposalMetadata,
        IDAO.Action[] calldata _actions,
        uint64 _startDate,
        uint64 _endDate,
        bool _executeIfDecided,
        VoteOption _choice
    ) external virtual returns (uint256 voteId);

    /// @inheritdoc IMajorityVoting
    function vote(
        uint256 _voteId,
        VoteOption _choice,
        bool _executesIfDecided
    ) public {
        if (_choice != VoteOption.None && !_canVote(_voteId, _msgSender())) {
            revert VoteCastForbidden(_voteId, _msgSender());
        }
        _vote(_voteId, _choice, _msgSender(), _executesIfDecided);
    }

    /// @inheritdoc IMajorityVoting
    function execute(uint256 _voteId) public {
        if (!_canExecute(_voteId)) revert VoteExecutionForbidden(_voteId);
        _execute(_voteId);
    }

    /// @inheritdoc IMajorityVoting
    function getVoteOption(uint256 _voteId, address _voter) public view returns (VoteOption) {
        return votes[_voteId].voters[_voter];
    }

    /// @inheritdoc IMajorityVoting
    function canVote(uint256 _voteId, address _voter) public view returns (bool) {
        return _canVote(_voteId, _voter);
    }

    /// @inheritdoc IMajorityVoting
    function canExecute(uint256 _voteId) public view returns (bool) {
        return _canExecute(_voteId);
    }

    /// @inheritdoc IMajorityVoting
    function getVote(uint256 _voteId)
        public
        view
        returns (
            bool open,
            bool executed,
            uint64 startDate,
            uint64 endDate,
            uint64 snapshotBlock,
            uint64 _relativeSupportThresholdPct,
            uint64 _totalSupportThresholdPct,
            uint256 census,
            uint256 yes,
            uint256 no,
            uint256 abstain,
            IDAO.Action[] memory actions
        )
    {
        Vote storage vote_ = votes[_voteId];

        open = _isVoteOpen(vote_);
        executed = vote_.executed;
        startDate = vote_.startDate;
        endDate = vote_.endDate;
        snapshotBlock = vote_.snapshotBlock;
        _relativeSupportThresholdPct = vote_.relativeSupportThresholdPct;
        _totalSupportThresholdPct = vote_.totalSupportThresholdPct;
        census = vote_.census;
        yes = vote_.yes;
        no = vote_.no;
        abstain = vote_.abstain;
        actions = vote_.actions;
    }

    /// @notice Internal function to cast a vote. It assumes the queried vote exists.
    /// @param _voteId The ID of the vote.
    /// @param _choice Whether voter abstains, supports or not supports to vote.
    /// @param _executesIfDecided if true, and it's the last vote required, immediately executes a vote.
    function _vote(
        uint256 _voteId,
        VoteOption _choice,
        address _voter,
        bool _executesIfDecided
    ) internal virtual;

    /// @notice Internal function to execute a vote. It assumes the queried vote exists.
    /// @param _voteId The ID of the vote.
    function _execute(uint256 _voteId) internal virtual {
        votes[_voteId].executed = true;

        bytes[] memory execResults = dao.execute(_voteId, votes[_voteId].actions);

        emit VoteExecuted(_voteId, execResults);
    }

    /// @notice Internal function to check if a voter can vote. It assumes the queried vote exists.
    /// @param _voteId The ID of the vote.
    /// @param _voter The address of the voter to check.
    /// @return True if the given voter can vote on a certain vote, false otherwise.
    function _canVote(uint256 _voteId, address _voter) internal view virtual returns (bool);

    /// @notice Internal function to check if a vote can be executed. It assumes the queried vote exists.
    /// @param _voteId The ID of the vote.
    /// @return True if the given vote can be executed, false otherwise.

    /// @notice Internal function to check if a vote can be executed. It assumes the queried vote exists.
    /// This function assumes vote configurations with `relativeSupportThresholdPct` values >= 50%. Under this assumption and if the total support (the number of yes votes relative to the `census` (the total number of eligible votes that can be casted a.k.a. plenum))  is larger than `relativeSupportThresholdPct`, the vote is already determined and can execute immediately, even if the voting period has not ended yet.
    /// @param _voteId The ID of the vote.
    /// @return True if the given vote can be executed, false otherwise.
    function _canExecute(uint256 _voteId) internal view virtual returns (bool) {
        Vote storage vote_ = votes[_voteId];

        // Verify that the vote has not been executed already.
        if (vote_.executed) {
            return false;
        }

        uint256 totalSupportPct = _calculatePct(vote_.yes, vote_.census);

        // EARLY EXECUTION (after the vote start but before the vote duration has passed)
        // The total support must greater than the relative support threshold (assuming that `relativeSupportThresholdPct > 50 >= totalSupportThresholdPct`).
        if (_isVoteOpen(vote_) && totalSupportPct > vote_.relativeSupportThresholdPct) {
            return true;
        }

        // NORMAL EXECUTION (after the vote duration has passed)
        // Both, the total and relative support must be met.

        // Criterium 1: The vote has ended.
        if (_isVoteOpen(vote_)) {
            return false;
        }

        // Criterium 2: The total support is greater than the total support threshold
        if (totalSupportPct <= vote_.totalSupportThresholdPct) {
            return false;
        }

        // Criterium 3: The relative support is greater than the relative support threshold
        uint256 relativeSupportPct = _calculatePct(vote_.yes, vote_.yes + vote_.no + vote_.abstain);
        if (relativeSupportPct <= vote_.relativeSupportThresholdPct) {
            return false;
        }

        // The criteria 1-3 above are met and the vote can execute.
        return true;
    }

    /// @notice Internal function to check if a vote is still open.
    /// @param vote_ the vote struct.
    /// @return True if the given vote is open, false otherwise.
    function _isVoteOpen(Vote storage vote_) internal view virtual returns (bool) {
        return
            getTimestamp64() < vote_.endDate &&
            getTimestamp64() >= vote_.startDate &&
            !vote_.executed;
    }

    /// @notice Calculates the relative of value with respect to a total as a percentage.
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
        uint64 _totalSupportThresholdPct,
        uint64 _relativeSupportThresholdPct,
        uint64 _minDuration
    ) internal virtual {
        if (_relativeSupportThresholdPct > PCT_BASE) {
            revert PercentageExceeds100({limit: PCT_BASE, actual: _relativeSupportThresholdPct});
        }

        if (_totalSupportThresholdPct > PCT_BASE) {
            revert PercentageExceeds100({limit: PCT_BASE, actual: _totalSupportThresholdPct});
        }

        if (_minDuration == 0) {
            revert VoteDurationZero();
        }

        totalSupportThresholdPct = _totalSupportThresholdPct;
        relativeSupportThresholdPct = _relativeSupportThresholdPct;
        minDuration = _minDuration;
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[47] private __gap;
}
