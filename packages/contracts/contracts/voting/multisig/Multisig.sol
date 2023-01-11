// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {SafeCastUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/math/SafeCastUpgradeable.sol";
import {CountersUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

import {PluginUUPSUpgradeable} from "../../core/plugin/PluginUUPSUpgradeable.sol";
import {IDAO} from "../../core/IDAO.sol";
import {_uncheckedAdd, _uncheckedSub} from "../../utils/UncheckedMath.sol";
import {IMajorityVoting} from "../majority/IMajorityVoting.sol";
import {Addresslist} from "../addresslist/Addresslist.sol";

/// @title Multisig
/// @author Aragon Association - 2022.
/// @notice The on-chain multisig governance plugin in which a proposal passes if X out of Y approvals are met.
/// @dev This contract inherits from `MajorityVotingBase` and implements the `IMajorityVoting` interface.
contract Multisig is PluginUUPSUpgradeable, Addresslist {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using SafeCastUpgradeable for uint256;

    /// @notice A container for proposal-related information.
    /// @param executed Whether the proposal is executed or not.
    /// @param parameters The proposal-specific approve settings at the time of the proposal creation.
    /// @param tally The approve tally of the proposal.
    /// @param approvers The approves casted by the approvers.
    /// @param actions The actions to be executed when the proposal passes.
    struct Proposal {
        bool executed;
        ProposalParameters parameters;
        Tally tally;
        mapping(address => bool) approvers;
        IDAO.Action[] actions;
    }

    /// @notice A container for the proposal parameters.
    /// @param minApprovals The number of approvals required.
    /// @param snapshotBlock The number of the block prior to the proposal creation.
    /// @param startDate The timestamp when the proposal starts
    /// @param endDate The timestamp when the proposal expires
    struct ProposalParameters {
        uint256 minApprovals;
        uint64 snapshotBlock;
        uint64 startDate;
        uint64 endDate;
    }

    /// @notice A container for the proposal tally.
    /// @param approvals The number of approvals casted.
    /// @param addresslistLength The length of the addresslist.
    struct Tally {
        uint256 approvals;
        uint256 addresslistLength;
    }

    /// @notice A container for the plugin settings.
    /// @param onlyListed Whether only listed addresses can create a proposal.
    /// @param minApprovals The minimum approvals parameter.
    struct MultisigSettings {
        bool onlyListed;
        uint16 minApprovals;
    }

    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 internal constant MULTISIG_INTERFACE_ID =
        this.addAddresses.selector ^
            this.removeAddresses.selector ^
            this.isListed.selector ^
            this.isListedAtBlock.selector ^
            this.addresslistLength.selector ^
            this.addresslistLengthAtBlock.selector ^
            this.proposalCount.selector ^
            this.initialize.selector;

    /// @notice The ID of the permission required to call the `addAddresses` and `removeAddresses` functions.
    bytes32 public constant UPDATE_MULTISIG_SETTINGS_PERMISSION_ID =
        keccak256("UPDATE_MULTISIG_SETTINGS_PERMISSION");

    /// @notice The incremental ID for proposals and executions.
    CountersUpgradeable.Counter private proposalCounter;

    /// @notice A mapping between proposal IDs and proposal information.
    mapping(uint256 => Proposal) internal proposals;

    /// @notice The current plugin settings.
    MultisigSettings public multisigSettings;

    /// @notice Thrown when a sender is not allowed to create a proposal.
    /// @param sender The sender address.
    error ProposalCreationForbidden(address sender);

    /// @notice Thrown if a approver is not allowed to cast an approve. This can be because the proposal
    /// - is not open,
    /// - was executed, or
    /// - the approver is not on the address list
    /// @param proposalId The ID of the proposal.
    /// @param sender The address of the sender.
    error ApprovalCastForbidden(uint256 proposalId, address sender);

    /// @notice Thrown if the proposal execution is forbidden.
    /// @param proposalId The ID of the proposal.
    error ProposalExecutionForbidden(uint256 proposalId);

    /// @notice Thrown if the minimal approvals value is out of bounds (less than 1 or greater than the number of members in the address list).
    /// @param limit The maximal value.
    /// @param actual The actual value.
    error MinApprovalsOutOfBounds(uint256 limit, uint256 actual);

    /// @notice Thrown if the start date is to small.
    /// @param limit The limit value.
    /// @param actual The actual value.
    error InvalidStartDate(uint64 limit, uint64 actual);

    /// @notice Thrown if the end date is to small.
    /// @param limit The limit value.
    /// @param actual The actual value.
    error InvalidEndDate(uint64 limit, uint64 actual);

    /// @notice Emitted when an proposal is approve by an approver.
    /// @param proposalId The ID of the proposal.
    /// @param approver The approver casting the approve.
    event Approved(uint256 indexed proposalId, address indexed approver);

    /// @notice Emitted when a proposal is created.
    /// @param proposalId The ID of the proposal.
    /// @param creator  The creator of the proposal.
    /// @param startDate The timestamp when the proposal starts.
    /// @param endDate The timestamp when the proposal ends.
    /// @param metadata The metadata of the proposal.
    /// @param actions The actions that will be executed if the proposal passes.
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        uint64 startDate,
        uint64 endDate,
        bytes metadata,
        IDAO.Action[] actions
    );

    /// @notice Emitted when a proposal is executed.
    /// @param proposalId The ID of the proposal.
    /// @param execResults The bytes array resulting from the proposal execution in the associated DAO.
    event ProposalExecuted(uint256 indexed proposalId, bytes[] execResults);

    /// @notice Emitted when the plugin settings are set.
    /// @param onlyListed Whether only listed addresses can create a proposal.
    /// @param minApprovals The minimum amount of approvals needed to pass a proposal.
    event MultisigSettingsUpdated(bool onlyListed, uint256 indexed minApprovals);

    /// @notice Initializes the component.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The IDAO interface of the associated DAO.
    /// @param _multisigSettings The multisig settings.
    function initialize(
        IDAO _dao,
        address[] calldata _members,
        MultisigSettings calldata _multisigSettings
    ) public initializer {
        __PluginUUPSUpgradeable_init(_dao);

        // add member addresses to the address list
        _addAddresses(_members);

        _updateMultisigSettings(_multisigSettings);
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interface.
    /// @return bool Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return _interfaceId == MULTISIG_INTERFACE_ID || super.supportsInterface(_interfaceId);
    }

    /// @notice Returns the proposal count determining the next proposal ID.
    /// @return The proposal count.
    function proposalCount() public view returns (uint256) {
        return proposalCounter.current();
    }

    /// @notice Returns the number of approvals,
    /// @param _proposalId The ID of the proposal.
    /// @return The number of approvals.
    function approvals(uint256 _proposalId) public view returns (uint256) {
        return proposals[_proposalId].tally.approvals;
    }

    /// @notice Adds new members to the address list and updates the minimum approval parameter.
    /// @param _members The addresses of the members to be added.
    function addAddresses(address[] calldata _members)
        external
        auth(UPDATE_MULTISIG_SETTINGS_PERMISSION_ID)
    {
        _addAddresses(_members);
    }

    /// @notice Removes existing members from the address list. Previously, it checks if the new address list length at least as long as the minimum approvals parameter requires. Note that `minApprovals` is must be at least 1 so the address list cannot become empty.
    /// @param _members The addresses of the members to be removed.
    function removeAddresses(address[] calldata _members)
        external
        auth(UPDATE_MULTISIG_SETTINGS_PERMISSION_ID)
    {
        _removeAddresses(_members);

        // Check if the new address list has become shorter than the current minimum number of approvals required.
        uint256 newAddresslistLength = addresslistLength();
        uint256 minApprovals_ = multisigSettings.minApprovals;
        if (newAddresslistLength < minApprovals_) {
            revert MinApprovalsOutOfBounds({limit: newAddresslistLength, actual: minApprovals_});
        }
    }

    /// @notice Updates the plugin settings.
    /// @param _multisigSettings The new settings.
    function updateMultisigSettings(MultisigSettings calldata _multisigSettings)
        external
        auth(UPDATE_MULTISIG_SETTINGS_PERMISSION_ID)
    {
        _updateMultisigSettings(_multisigSettings);
    }

    /// @notice Creates a new majority voting proposal.
    /// @param _metadata The metadata of the proposal.
    /// @param _actions The actions that will be executed after the proposal passes.
    /// @param _approveProposal If `true`, the sender will approve the proposal.
    /// @param _tryExecution If `true`, execution is tried after the vote cast. The call does not revert if early execution is not possible.
    /// @return proposalId The ID of the proposal.
    function createProposal(
        bytes calldata _metadata,
        IDAO.Action[] calldata _actions,
        bool _approveProposal,
        bool _tryExecution,
        uint64 _startDate,
        uint64 _endDate
    ) external returns (uint256 proposalId) {
        uint64 snapshotBlock = block.number.toUint64() - 1;

        if (multisigSettings.onlyListed && !isListedAtBlock(_msgSender(), snapshotBlock)) {
            revert ProposalCreationForbidden(_msgSender());
        }

        if (_startDate == 0) {
            _startDate = block.timestamp.toUint64();
        }

        if (_startDate < block.timestamp.toUint64()) {
            revert InvalidStartDate({limit: block.timestamp.toUint64(), actual: _startDate});
        }

        if (_endDate < _startDate) {
            revert InvalidEndDate({limit: _startDate, actual: _endDate});
        }

        proposalId = proposalCounter.current();

        // Create the proposal
        Proposal storage proposal_ = proposals[proposalId];

        proposal_.parameters.snapshotBlock = snapshotBlock;
        proposal_.parameters.minApprovals = multisigSettings.minApprovals;
        proposal_.parameters.startDate = _startDate;
        proposal_.parameters.endDate = _endDate;
        proposal_.tally.addresslistLength = addresslistLengthAtBlock(snapshotBlock); // TODO https://aragonassociation.atlassian.net/browse/APP-1417

        for (uint256 i; i < _actions.length; ) {
            proposal_.actions.push(_actions[i]);
            unchecked {
                ++i;
            }
        }

        _incrementProposalCount();

        if (_approveProposal) {
            approve(proposalId, _tryExecution);
        }

        emit ProposalCreated({
            proposalId: proposalId,
            creator: _msgSender(),
            startDate: _startDate,
            endDate: _endDate,
            metadata: _metadata,
            actions: _actions
        });
    }

    /// @notice Approves and, optionally, executes the proposal.
    /// @param _proposalId The ID of the proposal.
    /// @param _tryExecution If `true`, execution is tried after the approval cast. The call does not revert if execution is not possible.
    function approve(uint256 _proposalId, bool _tryExecution) public {
        address approver = _msgSender();
        if (!_canApprove(_proposalId, approver)) {
            revert ApprovalCastForbidden(_proposalId, approver);
        }

        Proposal storage proposal_ = proposals[_proposalId];

        unchecked {
            proposal_.tally.approvals += 1;
        }

        proposal_.approvers[approver] = true;

        emit Approved({proposalId: _proposalId, approver: approver});

        if (_tryExecution && _canExecute(_proposalId)) {
            _execute(_proposalId);
        }
    }

    /// @notice Checks if an account can participate on a proposal vote. This can be because the vote
    /// - was executed, or
    /// - the voter is not listed.
    /// @param _proposalId The proposal Id.
    /// @param _account The address of the user to check.
    /// @return bool Returns true if the account is allowed to vote.
    /// @dev The function assumes the queried proposal exists.
    function canApprove(uint256 _proposalId, address _account) external view returns (bool) {
        return _canApprove(_proposalId, _account);
    }

    /// @notice Checks if a proposal can be executed.
    /// @param _proposalId The ID of the proposal to be checked.
    /// @return True if the proposal can be executed, false otherwise.
    function canExecute(uint256 _proposalId) external view returns (bool) {
        return _canExecute(_proposalId);
    }

    /// @notice Returns all information for a proposal vote by its ID.
    /// @param _proposalId The ID of the proposal.
    /// @return executed Whether the proposal is executed or not.
    /// @return parameters The parameters of the proposal vote.
    /// @return tally The current tally of the proposal vote.
    /// @return actions The actions to be executed in the associated DAO after the proposal has passed.
    function getProposal(uint256 _proposalId)
        public
        view
        returns (
            bool executed,
            ProposalParameters memory parameters,
            Tally memory tally,
            IDAO.Action[] memory actions
        )
    {
        Proposal storage proposal_ = proposals[_proposalId];

        executed = proposal_.executed;
        parameters = proposal_.parameters;
        tally = proposal_.tally;
        actions = proposal_.actions;
    }

    /// @notice Returns whether the account has approved the proposal. Note, that this does not check if the account is listed.
    /// @param _proposalId The ID of the proposal.
    /// @param _account The account address to be checked.
    /// @return The vote option cast by a voter for a certain proposal.
    function hasApproved(uint256 _proposalId, address _account) public view returns (bool) {
        return proposals[_proposalId].approvers[_account];
    }

    /// @notice Executes a proposal.
    /// @param _proposalId The ID of the proposal to be executed.
    function execute(uint256 _proposalId) public {
        if (!_canExecute(_proposalId)) {
            revert ProposalExecutionForbidden(_proposalId);
        }

        _execute(_proposalId);
    }

    /// @notice Internal function to execute a vote. It assumes the queried proposal exists.
    /// @param _proposalId The ID of the proposal.
    function _execute(uint256 _proposalId) internal {
        Proposal storage proposal_ = proposals[_proposalId];

        proposal_.executed = true;

        bytes[] memory execResults = dao.execute(_proposalId, proposal_.actions);
        emit ProposalExecuted({proposalId: _proposalId, execResults: execResults});
    }

    /// @notice Internal function to check if an account can approve. It assumes the queried proposal exists. //TODO is this assumption relevant?
    /// @param _proposalId The ID of the proposal.
    /// @param _account The account to check.
    /// @return Returns `true` if the given account can approve on a certain proposal and `false` otherwise.
    function _canApprove(uint256 _proposalId, address _account) internal view returns (bool) {
        Proposal storage proposal_ = proposals[_proposalId];

        if (!_isProposalOpen(proposal_)) {
            // The proposal was executed already
            return false;
        }

        if (!isListedAtBlock(_account, proposal_.parameters.snapshotBlock)) {
            // The approver has no voting power.
            return false;
        }

        if (proposal_.approvers[_account]) {
            // The approver has already approved
            return false;
        }

        return true;
    }

    /// @notice Internal function to check if a proposal can be executed. It assumes the queried proposal exists.
    /// @param _proposalId The ID of the proposal.
    /// @return Returns `true` if the proposal can be executed and `false` otherwise.
    function _canExecute(uint256 _proposalId) internal view returns (bool) {
        Proposal storage proposal_ = proposals[_proposalId];

        // Verify that the proposal has not been executed or expired.
        if (!_isProposalOpen(proposal_)) {
            return false;
        }

        return proposal_.tally.approvals >= proposal_.parameters.minApprovals;
    }

    /// @notice Internal function to check if a proposal vote is still open.
    /// @param proposal_ The proposal struct.
    /// @return True if the proposal vote is open, false otherwise.
    function _isProposalOpen(Proposal storage proposal_) internal view returns (bool) {
        uint64 currentTimestamp64 = block.timestamp.toUint64();
        return
            !proposal_.executed &&
            proposal_.parameters.startDate <= currentTimestamp64 &&
            proposal_.parameters.endDate >= currentTimestamp64;
    }

    /// @notice Internal function to increments the proposal count by one.
    function _incrementProposalCount() internal {
        return proposalCounter.increment();
    }

    /// @notice Internal function to update the plugin settings.
    function _updateMultisigSettings(MultisigSettings calldata _multisigSettings) internal {
        uint256 addresslistLength_ = addresslistLength();

        if (_multisigSettings.minApprovals > addresslistLength_) {
            revert MinApprovalsOutOfBounds({
                limit: addresslistLength_,
                actual: _multisigSettings.minApprovals
            });
        }

        if (_multisigSettings.minApprovals < 1) {
            revert MinApprovalsOutOfBounds({limit: 1, actual: _multisigSettings.minApprovals});
        }

        multisigSettings = _multisigSettings;
        emit MultisigSettingsUpdated({
            onlyListed: _multisigSettings.onlyListed,
            minApprovals: _multisigSettings.minApprovals
        });
    }

    /// @dev This empty reserved space is put in place to allow future versions to add new
    /// variables without shifting down storage in the inheritance chain.
    /// https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    uint256[46] private __gap;
}
