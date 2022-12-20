// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {CheckpointsUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CheckpointsUpgradeable.sol";
import {CountersUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

import {PluginUUPSUpgradeable} from "../../core/plugin/PluginUUPSUpgradeable.sol";
import {_uncheckedAdd, _uncheckedSub} from "../../utils/UncheckedMath.sol";
import {IDAO} from "../../core/IDAO.sol";
import {MajorityVotingBase} from "../majority/MajorityVotingBase.sol";
import {IMajorityVoting} from "../majority/IMajorityVoting.sol";
import {Addresslist} from "./Addresslist.sol";

/// @title AddresslistVoting
/// @author Aragon Association - 2021-2022.
/// @notice The majority voting implementation using an list of member addresses.
/// @dev This contract inherits from `MajorityVotingBase` and implements the `IMajorityVoting` interface.
contract AddresslistVoting is Addresslist, MajorityVotingBase {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 internal constant ADDRESSLIST_VOTING_INTERFACE_ID =
        this.addAddresses.selector ^
            this.removeAddresses.selector ^
            this.isListed.selector ^
            this.addresslistLength.selector ^
            this.initialize.selector;

    /// @notice The ID of the permission required to call the `addAddresses` and `removeAddresses` functions.
    bytes32 public constant MODIFY_ADDRESSLIST_PERMISSION_ID =
        keccak256("MODIFY_ADDRESSLIST_PERMISSION");

    /// @notice Emitted when new members are added to the address list.
    /// @param members The array of member addresses to be added.
    event AddressesAdded(address[] members);

    /// @notice Emitted when members are removed from the address list.
    /// @param members The array of member addresses to be removed.
    event AddressesRemoved(address[] members);

    /// @notice Initializes the component.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The IDAO interface of the associated DAO.
    /// @param _votingSettings The voting settings.
    function initialize(
        IDAO _dao,
        VotingSettings calldata _votingSettings,
        address[] calldata _members
    ) public initializer {
        __MajorityVotingBase_init(_dao, _votingSettings);

        // add member addresses to the address list
        _updateAddresslist(_members, true);
        emit AddressesAdded({members: _members});
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interface.
    /// @return bool Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == ADDRESSLIST_VOTING_INTERFACE_ID ||
            super.supportsInterface(_interfaceId);
    }

    /// @notice Adds new members to the address list.
    /// @param _members The addresses of members to be added.
    /// @dev This functin is used during the plugin initialization.
    function addAddresses(address[] calldata _members)
        external
        auth(MODIFY_ADDRESSLIST_PERMISSION_ID)
    {
        _updateAddresslist(_members, true);

        emit AddressesAdded({members: _members});
    }

    /// @notice Removes existing members from the address list.
    /// @param _members The addresses of the members to be removed.
    function removeAddresses(address[] calldata _members)
        external
        auth(MODIFY_ADDRESSLIST_PERMISSION_ID)
    {
        _updateAddresslist(_members, false);

        emit AddressesRemoved({members: _members});
    }

    /// @inheritdoc MajorityVotingBase
    function createProposal(
        bytes calldata _metadata,
        IDAO.Action[] calldata _actions,
        uint64 _startDate,
        uint64 _endDate,
        VoteOption _voteOption,
        bool _tryEarlyExecution
    ) external override returns (uint256 id) {
        uint64 snapshotBlock = getBlockNumber64() - 1;

        if (minProposerVotingPower() != 0 && !isListed(_msgSender(), snapshotBlock)) {
            revert ProposalCreationForbidden(_msgSender());
        }

        id = _createProposal(_msgSender(), _metadata, _actions);

        // Store proposal related information
        Proposal storage proposal_ = proposals[id];

        (proposal_.parameters.startDate, proposal_.parameters.endDate) = _validateProposalDates(
            _startDate,
            _endDate
        );
        proposal_.parameters.snapshotBlock = snapshotBlock;
        proposal_.parameters.votingMode = votingMode();
        proposal_.parameters.supportThreshold = supportThreshold();
        proposal_.parameters.minParticipation = minParticipation();

        proposal_.tally.totalVotingPower = addresslistLength(snapshotBlock);

        unchecked {
            for (uint256 i = 0; i < _actions.length; i++) {
                proposal_.actions.push(_actions[i]);
            }
        }

        vote(id, _voteOption, _tryEarlyExecution);
    }

    /// @inheritdoc MajorityVotingBase
    function _vote(
        uint256 _proposalId,
        VoteOption _voteOption,
        address _voter,
        bool _tryEarlyExecution
    ) internal override {
        Proposal storage proposal_ = proposals[_proposalId];

        VoteOption state = proposal_.voters[_voter];

        // Remove the previous vote.
        if (state == VoteOption.Yes) {
            proposal_.tally.yes = proposal_.tally.yes - 1;
        } else if (state == VoteOption.No) {
            proposal_.tally.no = proposal_.tally.no - 1;
        } else if (state == VoteOption.Abstain) {
            proposal_.tally.abstain = proposal_.tally.abstain - 1;
        }

        // Store the updated/new vote for the voter.
        if (_voteOption == VoteOption.Yes) {
            proposal_.tally.yes = proposal_.tally.yes + 1;
        } else if (_voteOption == VoteOption.No) {
            proposal_.tally.no = proposal_.tally.no + 1;
        } else if (_voteOption == VoteOption.Abstain) {
            proposal_.tally.abstain = proposal_.tally.abstain + 1;
        }

        proposal_.voters[_voter] = _voteOption;

        emit VoteCast({
            proposalId: _proposalId,
            voter: _voter,
            voteOption: _voteOption,
            votingPower: 1
        });

        if (_tryEarlyExecution && _canExecute(_proposalId)) {
            _execute(_proposalId);
        }
    }

    /// @inheritdoc MajorityVotingBase
    function _canVote(uint256 _proposalId, address _account) internal view override returns (bool) {
        Proposal storage proposal_ = proposals[_proposalId];

        if (!_isVoteOpen(proposal_)) {
            // The proposal vote hasn't started or has already ended.
            return false;
        } else if (!isListed(_account, proposal_.parameters.snapshotBlock)) {
            // The voter has no voting power.
            return false;
        } else if (
            proposal_.voters[_account] != VoteOption.None &&
            proposal_.parameters.votingMode != VotingMode.VoteReplacement
        ) {
            // The voter has already voted but vote replacment is not allowed.
            return false;
        }

        return true;
    }

    /// @dev This empty reserved space is put in place to allow future versions to add new
    /// variables without shifting down storage in the inheritance chain.
    /// https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    uint256[48] private __gap;
}
