// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {CheckpointsUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CheckpointsUpgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {PluginUUPSUpgradeable} from "../../core/plugin/PluginUUPSUpgradeable.sol";

import {_uncheckedAdd, _uncheckedSub} from "../../utils/UncheckedMath.sol";
import {MajorityVotingBase} from "../majority/MajorityVotingBase.sol";
import {IDAO} from "../../core/IDAO.sol";
import {IMajorityVoting} from "../majority/IMajorityVoting.sol";
import {Addresslist} from "../addresslist/Addresslist.sol";

/// @title Multisig
/// @author Aragon Association - 2021-2022.
/// @notice TODO.
/// @dev This contract inherits from `MajorityVotingBase` and implements the `IMajorityVoting` interface.
contract Multisig is Initializable, ERC165Upgradeable, Addresslist, PluginUUPSUpgradeable {
    /// @notice Vote options that a voter can chose from.
    /// @param None The default option state of a signer indicating the absence of from the .
    /// @param Confirmed This option confirms the proposal.
    enum SignOption {
        None,
        Confirmed
    }

    /// @notice A container for proposal-related information.
    /// @param executed Wheter the proposal is executed or not.
    /// @param parameters The proposal-specific vote settings at the time of the proposal creation.
    /// @param tally The vote tally of the proposal.
    /// @param voters The votes casted by the voters.
    /// @param actions The actions to be executed when the proposal passes.
    struct Proposal {
        bool executed;
        ProposalParameters parameters;
        Tally tally;
        mapping(address => SignOption) voters;
        IDAO.Action[] actions;
    }

    /// @notice A container for the .
    /// @param confirmationsRequired The number of confirmations required.
    /// @param snapshotBlock The number of the block prior to the proposal creation.
    struct ProposalParameters {
        uint64 confirmationsRequired;
        uint64 snapshotBlock;
    }

    /// @notice A container for the proposal vote tally.
    /// @param abstain The number of abstain votes casted.
    /// @param yes The number of yes votes casted.
    /// @param no The number of no votes casted.
    /// @param signerCount The total voting power available at the block prior to the proposal creation.
    struct Tally {
        uint256 approvals;
        uint256 signerCount;
    }

    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 internal constant MULTISIG_INTERFACE_ID =
        this.addAddresses.selector ^
            this.removeAddresses.selector ^
            this.isListed.selector ^
            this.addresslistLength.selector ^
            this.initialize.selector;

    /// @notice The ID of the permission required to call the `addAddresses` and `removeAddresses` functions.
    bytes32 public constant MODIFY_ADDRESSLIST_PERMISSION_ID =
        keccak256("MODIFY_ADDRESSLIST_PERMISSION");

    /// @notice The ID of the permission required to call the `updateVotingSettings` function.
    bytes32 public constant UPDATE_VOTING_SETTINGS_PERMISSION_ID =
        keccak256("UPDATE_VOTING_SETTINGS_PERMISSION");

    uint64 private confirmationsRequired;

    /// @notice A counter counting the created proposals.
    uint256 public proposalCount; // TODO put this in a proposals interface

    /// @notice A mapping between proposal IDs and proposal information.
    mapping(uint256 => Proposal) internal proposals;

    /// @notice Emitted when a proposal is created.
    /// @param proposalId  The ID of the proposal.
    /// @param creator  The creator of the proposal.
    /// @param metadata The metadata of the proposal.
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        bytes metadata,
        IDAO.Action[] actions
    );

    /// @notice Emitted when a proposal is executed.
    /// @param proposalId  The ID of the proposal.
    /// @param execResults The bytes array resulting from the vote execution in the associated DAO.
    event ProposalExecuted(uint256 indexed proposalId, bytes[] execResults);

    /// @notice Thrown when a sender is not allowed to create a vote.
    /// @param sender The sender address.
    error ProposalCreationForbidden(address sender);

    /// @notice Emitted when a vote is cast by a voter.
    /// @param proposalId The ID of the proposal.
    /// @param voter The voter casting the vote.
    /// @param voteOption The vote option chosen.
    /// @param votingPower The voting power behind this vote.
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        SignOption voteOption,
        uint256 votingPower
    );

    /// @notice Initializes the component.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The IDAO interface of the associated DAO.
    // /// @param _majorityVotingSettings The majority voting settings.
    function initialize(
        IDAO _dao,
        uint64 _confirmationsRequired,
        address[] calldata _members
    ) public initializer {
        __PluginUUPSUpgradeable_init(_dao);

        confirmationsRequired = _confirmationsRequired;

        // add member addresses to the address list
        _addAddresses(_members);
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interace.
    /// @return bool Returns true if the interface is supported.
    function supportsInterface(bytes4 _interfaceId)
        public
        view
        virtual
        override(ERC165Upgradeable, PluginUUPSUpgradeable)
        returns (bool)
    {
        return _interfaceId == MULTISIG_INTERFACE_ID || super.supportsInterface(_interfaceId);
    }

    function updateVotingSettings(uint64 _confirmationsRequired)
        external
        auth(UPDATE_VOTING_SETTINGS_PERMISSION_ID)
    {
        confirmationsRequired = _confirmationsRequired;
    }

    /// @notice Adds new members to the address list.
    /// @param _members The addresses of the members to be added.
    function addAddresses(address[] calldata _members)
        external
        auth(MODIFY_ADDRESSLIST_PERMISSION_ID)
    {
        _addAddresses(_members);
    }

    /// @notice Removes existing members from the address list.
    /// @param _members The addresses of the members to be removed.
    function removeAddresses(address[] calldata _members)
        external
        auth(MODIFY_ADDRESSLIST_PERMISSION_ID)
    {
        _removeAddresses(_members);
    }

    function createProposal(bytes calldata _metadata, IDAO.Action[] calldata _actions)
        external
        returns (uint256 proposalId)
    {
        uint64 snapshotBlock = getBlockNumber64() - 1;

        if (!isListed(_msgSender(), snapshotBlock)) {
            revert ProposalCreationForbidden(_msgSender());
        }

        proposalId = proposalCount++;

        // Create the proposal
        Proposal storage proposal_ = proposals[proposalId];

        proposal_.parameters.snapshotBlock = snapshotBlock;
        proposal_.parameters.confirmationsRequired = confirmationsRequired;
        proposal_.tally.signerCount = addresslistLength(snapshotBlock);

        unchecked {
            for (uint256 i = 0; i < _actions.length; i++) {
                proposal_.actions.push(_actions[i]);
            }
        }

        emit ProposalCreated({
            proposalId: proposalId,
            creator: _msgSender(),
            metadata: _metadata,
            actions: _actions
        });
    }

    function approve(uint256 _proposalId, address _voter) external {
        Proposal storage proposal_ = proposals[_proposalId];

        if (isListed(_voter, proposal_.parameters.snapshotBlock)) {
            proposal_.voters[_voter] = SignOption.Confirmed;
            proposal_.tally.approvals += 1;
        }
    }

    function _execute(uint256 _proposalId) internal virtual {
        proposals[_proposalId].executed = true;

        bytes[] memory execResults = dao.execute(_proposalId, proposals[_proposalId].actions);

        emit ProposalExecuted({proposalId: _proposalId, execResults: execResults});
    }

    /// @notice Internal function to check if an account can approve. It assumes the queried proposal exists.
    /// @param _proposalId The ID of the proposal.
    /// @param _signer The address of the voter to check.
    /// @return Returns `true` if the given voter can vote on a certain proposal and `false` otherwise.
    function _canApprove(uint256 _proposalId, address _signer) internal view returns (bool) {
        Proposal storage proposal_ = proposals[_proposalId];

        if (!isListed(_signer, proposal_.parameters.snapshotBlock)) {
            // The voter has no voting power.
            return false;
        } else if (proposal_.voters[_signer] != SignOption.None) {
            // The signer has already approved
            return false;
        }

        return true;
    }

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

        return proposal_.tally.approvals >= proposal_.parameters.confirmationsRequired;
    }

    function _vote(
        uint256 _proposalId,
        SignOption _voteOption,
        address _voter,
        bool _tryEarlyExecution
    ) internal {
        Proposal storage proposal_ = proposals[_proposalId];

        SignOption state = proposal_.voters[_voter];
        // Remove the previous vote.
        if (state == SignOption.Confirmed) {
            proposal_.tally.approvals -= 1;
        }

        // Store the updated/new vote for the voter.
        if (_voteOption == SignOption.Confirmed) {
            proposal_.tally.approvals += 1;
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

    /// @dev This empty reserved space is put in place to allow future versions to add new
    /// variables without shifting down storage in the inheritance chain.
    /// https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    uint256[48] private __gap;
}
