// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IVotesUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/utils/IVotesUpgradeable.sol";
import {SafeCastUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/math/SafeCastUpgradeable.sol";

import {IDAO} from "../../core/IDAO.sol";
import {MajorityVotingBase} from "../majority/MajorityVotingBase.sol";
import {IMajorityVoting} from "../majority/IMajorityVoting.sol";

/// @title TokenVoting
/// @author Aragon Association - 2021-2022
/// @notice The majority voting implementation using an [OpenZepplin `Votes`](https://docs.openzeppelin.com/contracts/4.x/api/governance#Votes) compatible governance token.
/// @dev This contract inherits from `MajorityVotingBase` and implements the `IMajorityVoting` interface.
contract TokenVoting is MajorityVotingBase {
    using SafeCastUpgradeable for uint256;

    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 internal constant TOKEN_VOTING_INTERFACE_ID =
        this.getVotingToken.selector ^ this.initialize.selector;

    /// @notice An [OpenZepplin `Votes`](https://docs.openzeppelin.com/contracts/4.x/api/governance#Votes) compatible contract referencing the token being used for voting.
    IVotesUpgradeable private votingToken;

    /// @notice Thrown if the voting power is zero
    error NoVotingPower();

    /// @notice Initializes the component.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The IDAO interface of the associated DAO.
    /// @param _votingSettings The voting settings.
    /// @param _token The [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token used for voting.
    function initialize(
        IDAO _dao,
        VotingSettings calldata _votingSettings,
        IVotesUpgradeable _token
    ) public initializer {
        __MajorityVotingBase_init(_dao, _votingSettings);

        votingToken = _token;
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interface.
    /// @return bool Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return _interfaceId == TOKEN_VOTING_INTERFACE_ID || super.supportsInterface(_interfaceId);
    }

    /// @notice getter function for the voting token.
    /// @dev public function also useful for registering interfaceId and for distinguishing from majority voting interface.
    /// @return IVotesUpgradeable the token used for voting.
    function getVotingToken() public view returns (IVotesUpgradeable) {
        return votingToken;
    }

    /// @inheritdoc MajorityVotingBase
    function totalVotingPower(uint256 _blockNumber) public view override returns (uint256) {
        return votingToken.getPastTotalSupply(_blockNumber);
    }

    /// @inheritdoc MajorityVotingBase
    function createProposal(
        bytes calldata _metadata,
        IDAO.Action[] calldata _actions,
        uint64 _startDate,
        uint64 _endDate,
        VoteOption _voteOption,
        bool _tryEarlyExecution
    ) external override returns (uint256 proposalId) {
        uint256 snapshotBlock;
        unchecked {
            snapshotBlock = block.number - 1;
        }

        if (totalVotingPower(uint256(snapshotBlock)) == 0) {
            revert NoVotingPower();
        }

        if (votingToken.getPastVotes(_msgSender(), snapshotBlock) < minProposerVotingPower()) {
            revert ProposalCreationForbidden(_msgSender());
        }

        proposalId = _createProposal({
            _creator: _msgSender(),
            _metadata: _metadata,
            _startDate: _startDate,
            _endDate: _endDate,
            _actions: _actions
        });

        // Store proposal related information
        Proposal storage proposal_ = proposals[proposalId];

        (proposal_.parameters.startDate, proposal_.parameters.endDate) = _validateProposalDates(
            _startDate,
            _endDate
        );
        proposal_.parameters.snapshotBlock = snapshotBlock.toUint64();
        proposal_.parameters.votingMode = votingMode();
        proposal_.parameters.supportThreshold = supportThreshold();
        proposal_.parameters.minParticipation = minParticipation();

        for (uint256 i; i < _actions.length; ) {
            proposal_.actions.push(_actions[i]);
            unchecked {
                ++i;
            }
        }

        if (_voteOption != VoteOption.None) {
            vote(proposalId, _voteOption, _tryEarlyExecution);
        }
    }

    /// @inheritdoc MajorityVotingBase
    function _vote(
        uint256 _proposalId,
        VoteOption _voteOption,
        address _voter,
        bool _tryEarlyExecution
    ) internal override {
        Proposal storage proposal_ = proposals[_proposalId];

        // This could re-enter, though we can assume the governance token is not malicious
        uint256 votingPower = votingToken.getPastVotes(_voter, proposal_.parameters.snapshotBlock);
        VoteOption state = proposal_.voters[_voter];

        // If voter had previously voted, decrease count
        if (state == VoteOption.Yes) {
            proposal_.tally.yes = proposal_.tally.yes - votingPower;
        } else if (state == VoteOption.No) {
            proposal_.tally.no = proposal_.tally.no - votingPower;
        } else if (state == VoteOption.Abstain) {
            proposal_.tally.abstain = proposal_.tally.abstain - votingPower;
        }

        // write the updated/new vote for the voter.
        if (_voteOption == VoteOption.Yes) {
            proposal_.tally.yes = proposal_.tally.yes + votingPower;
        } else if (_voteOption == VoteOption.No) {
            proposal_.tally.no = proposal_.tally.no + votingPower;
        } else if (_voteOption == VoteOption.Abstain) {
            proposal_.tally.abstain = proposal_.tally.abstain + votingPower;
        }

        proposal_.voters[_voter] = _voteOption;

        emit VoteCast({
            proposalId: _proposalId,
            voter: _voter,
            voteOption: _voteOption,
            votingPower: votingPower
        });

        if (_tryEarlyExecution && _canExecute(_proposalId)) {
            _execute(_proposalId);
        }
    }

    /// @inheritdoc MajorityVotingBase
    function _canVote(
        uint256 _proposalId,
        address _account,
        VoteOption _voteOption
    ) internal view override returns (bool) {
        Proposal storage proposal_ = proposals[_proposalId];

        // The proposal vote hasn't started or has already ended.
        if (!_isProposalOpen(proposal_)) {
            return false;
        }

        // The voter votes `None` which is not allowed.
        if (_voteOption == VoteOption.None) {
            return false;
        }

        // The voter has no voting power.
        if (votingToken.getPastVotes(_account, proposal_.parameters.snapshotBlock) == 0) {
            return false;
        }

        // The voter has already voted but vote replacment is not allowed.
        if (
            proposal_.voters[_account] != VoteOption.None &&
            proposal_.parameters.votingMode != VotingMode.VoteReplacement
        ) {
            return false;
        }

        return true;
    }

    /// @dev This empty reserved space is put in place to allow future versions to add new
    /// variables without shifting down storage in the inheritance chain.
    /// https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    uint256[49] private __gap;
}
