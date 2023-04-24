// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {SafeCastUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/math/SafeCastUpgradeable.sol";

import {IDAO} from "../../../core/dao/IDAO.sol";
import {IMembership} from "../../../core/plugin/membership/IMembership.sol";
import {PluginUUPSUpgradeable} from "../../../core/plugin/PluginUUPSUpgradeable.sol";

import {ProposalUpgradeable} from "../../../core/plugin/proposal/ProposalUpgradeable.sol";
import {Addresslist} from "../../utils/Addresslist.sol";
import {IMultisig} from "./IMultisig.sol";

/// @title Multisig - Release 1, Build 2
/// @author Aragon Association - 2022-2023
/// @notice The on-chain multisig governance plugin in which a proposal passes if X out of Y approvals are met.
contract Multisig is
    IMultisig,
    IMembership,
    PluginUUPSUpgradeable,
    ProposalUpgradeable,
    Addresslist
{
    using SafeCastUpgradeable for uint256;

    /// @notice A container for proposal-related information.
    /// @param executed Whether the proposal is executed or not.
    /// @param approvals The number of approvals casted.
    /// @param parameters The proposal-specific approve settings at the time of the proposal creation.
    /// @param approvers The approves casted by the approvers.
    /// @param actions The actions to be executed when the proposal passes.
    /// @param _allowFailureMap A bitmap allowing the proposal to succeed, even if individual actions might revert. If the bit at index `i` is 1, the proposal succeeds even if the `i`th action reverts. A failure map value of 0 requires every action to not revert.
    struct Proposal {
        bool executed;
        uint16 approvals;
        ProposalParameters parameters;
        mapping(address => bool) approvers;
        IDAO.Action[] actions;
        uint256 allowFailureMap;
    }

    /// @notice A container for the proposal parameters.
    /// @param minApprovals The number of approvals required.
    /// @param snapshotBlock The number of the block prior to the proposal creation.
    /// @param startDate The timestamp when the proposal starts.
    /// @param endDate The timestamp when the proposal expires.
    struct ProposalParameters {
        uint16 minApprovals;
        uint64 snapshotBlock;
        uint64 startDate;
        uint64 endDate;
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
        this.initialize.selector ^
            this.updateMultisigSettings.selector ^
            this.createProposal.selector ^
            this.getProposal.selector;

    /// @notice The ID of the permission required to call the `addAddresses` and `removeAddresses` functions.
    bytes32 public constant UPDATE_MULTISIG_SETTINGS_PERMISSION_ID =
        keccak256("UPDATE_MULTISIG_SETTINGS_PERMISSION");

    /// @notice A mapping between proposal IDs and proposal information.
    mapping(uint256 => Proposal) internal proposals;

    /// @notice The current plugin settings.
    MultisigSettings public multisigSettings;

    /// @notice Keeps track at which block number the multisig settings have been changed the last time.
    /// @dev This variable prevents a proposal from being created in the same block in which the multisig settings change.
    uint64 public lastMultisigSettingsChange;

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
    error MinApprovalsOutOfBounds(uint16 limit, uint16 actual);

    /// @notice Thrown if the addresslist length is out of bounds.
    /// @param limit The limit value.
    /// @param actual The actual value.
    error AddresslistLengthOutOfBounds(uint16 limit, uint256 actual);

    /// @notice Thrown if a date is out of bounds.
    /// @param limit The limit value.
    /// @param actual The actual value.
    error DateOutOfBounds(uint64 limit, uint64 actual);

    /// @notice Emitted when an proposal is approve by an approver.
    /// @param proposalId The ID of the proposal.
    /// @param approver The approver casting the approve.
    event Approved(uint256 indexed proposalId, address indexed approver);

    /// @notice Emitted when the plugin settings are set.
    /// @param onlyListed Whether only listed addresses can create a proposal.
    /// @param minApprovals The minimum amount of approvals needed to pass a proposal.
    event MultisigSettingsUpdated(bool onlyListed, uint16 indexed minApprovals);

    /// @notice Initializes Release 1, Build 2.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The IDAO interface of the associated DAO.
    /// @param _multisigSettings The multisig settings.
    function initialize(
        IDAO _dao,
        address[] calldata _members,
        MultisigSettings calldata _multisigSettings
    ) external initializer {
        __PluginUUPSUpgradeable_init(_dao);

        if (_members.length > type(uint16).max) {
            revert AddresslistLengthOutOfBounds({limit: type(uint16).max, actual: _members.length});
        }

        _addAddresses(_members);
        emit MembersAdded({members: _members});

        _updateMultisigSettings(_multisigSettings);
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interface.
    /// @return Returns `true` if the interface is supported.
    function supportsInterface(
        bytes4 _interfaceId
    ) public view virtual override(PluginUUPSUpgradeable, ProposalUpgradeable) returns (bool) {
        return
            _interfaceId == MULTISIG_INTERFACE_ID ||
            _interfaceId == type(IMultisig).interfaceId ||
            _interfaceId == type(Addresslist).interfaceId ||
            _interfaceId == type(IMembership).interfaceId ||
            super.supportsInterface(_interfaceId);
    }

    /// @inheritdoc IMultisig
    function addAddresses(
        address[] calldata _members
    ) external auth(UPDATE_MULTISIG_SETTINGS_PERMISSION_ID) {
        uint256 newAddresslistLength = addresslistLength() + _members.length;

        // Check if the new address list length would be greater than `type(uint16).max`, the maximal number of approvals.
        if (newAddresslistLength > type(uint16).max) {
            revert AddresslistLengthOutOfBounds({
                limit: type(uint16).max,
                actual: newAddresslistLength
            });
        }

        _addAddresses(_members);

        emit MembersAdded({members: _members});
    }

    /// @inheritdoc IMultisig
    function removeAddresses(
        address[] calldata _members
    ) external auth(UPDATE_MULTISIG_SETTINGS_PERMISSION_ID) {
        uint16 newAddresslistLength = uint16(addresslistLength() - _members.length);

        // Check if the new address list length would become less than the current minimum number of approvals required.
        if (newAddresslistLength < multisigSettings.minApprovals) {
            revert MinApprovalsOutOfBounds({
                limit: newAddresslistLength,
                actual: multisigSettings.minApprovals
            });
        }

        _removeAddresses(_members);

        emit MembersRemoved({members: _members});
    }

    /// @notice Updates the plugin settings.
    /// @param _multisigSettings The new settings.
    function updateMultisigSettings(
        MultisigSettings calldata _multisigSettings
    ) external auth(UPDATE_MULTISIG_SETTINGS_PERMISSION_ID) {
        _updateMultisigSettings(_multisigSettings);
    }

    /// @notice Creates a new majority voting proposal.
    /// @param _metadata The metadata of the proposal.
    /// @param _actions The actions that will be executed after the proposal passes.
    /// @param _allowFailureMap A bitmap allowing the proposal to succeed, even if individual actions might revert. If the bit at index `i` is 1, the proposal succeeds even if the `i`th action reverts. A failure map value of 0 requires every action to not revert.
    /// @param _approveProposal If `true`, the sender will approve the proposal.
    /// @param _tryExecution If `true`, execution is tried after the vote cast. The call does not revert if early execution is not possible.
    /// @return proposalId The ID of the proposal.
    function createProposal(
        bytes calldata _metadata,
        IDAO.Action[] calldata _actions,
        uint256 _allowFailureMap,
        bool _approveProposal,
        bool _tryExecution,
        uint64 _startDate,
        uint64 _endDate
    ) external returns (uint256 proposalId) {
        uint64 snapshotBlock = block.number.toUint64() - 1;

        // Revert if the settings have been changed in the same block as this proposal should be created in.
        // This prevents a malicious party from voting with previous addresses and the new settings.
        if (lastMultisigSettingsChange > snapshotBlock) {
            revert ProposalCreationForbidden(_msgSender());
        }

        if (multisigSettings.onlyListed && !isListedAtBlock(_msgSender(), snapshotBlock)) {
            revert ProposalCreationForbidden(_msgSender());
        }

        if (_startDate == 0) {
            _startDate = block.timestamp.toUint64();
        } else if (_startDate < block.timestamp.toUint64()) {
            revert DateOutOfBounds({limit: block.timestamp.toUint64(), actual: _startDate});
        }

        if (_endDate < _startDate) {
            revert DateOutOfBounds({limit: _startDate, actual: _endDate});
        }

        proposalId = _createProposal({
            _creator: _msgSender(),
            _metadata: _metadata,
            _startDate: _startDate,
            _endDate: _endDate,
            _actions: _actions,
            _allowFailureMap: _allowFailureMap
        });

        // Create the proposal
        Proposal storage proposal_ = proposals[proposalId];

        proposal_.parameters.snapshotBlock = snapshotBlock;
        proposal_.parameters.startDate = _startDate;
        proposal_.parameters.endDate = _endDate;
        proposal_.parameters.minApprovals = multisigSettings.minApprovals;

        // Reduce costs
        if (_allowFailureMap != 0) {
            proposal_.allowFailureMap = _allowFailureMap;
        }

        for (uint256 i; i < _actions.length; ) {
            proposal_.actions.push(_actions[i]);
            unchecked {
                ++i;
            }
        }

        if (_approveProposal) {
            approve(proposalId, _tryExecution);
        }
    }

    /// @inheritdoc IMultisig
    function approve(uint256 _proposalId, bool _tryExecution) public {
        address approver = _msgSender();
        if (!_canApprove(_proposalId, approver)) {
            revert ApprovalCastForbidden(_proposalId, approver);
        }

        Proposal storage proposal_ = proposals[_proposalId];

        // As the list can never become more than type(uint16).max(due to addAddresses check)
        // It's safe to use unchecked as it would never overflow.
        unchecked {
            proposal_.approvals += 1;
        }

        proposal_.approvers[approver] = true;

        emit Approved({proposalId: _proposalId, approver: approver});

        if (_tryExecution && _canExecute(_proposalId)) {
            _execute(_proposalId);
        }
    }

    /// @inheritdoc IMultisig
    function canApprove(uint256 _proposalId, address _account) external view returns (bool) {
        return _canApprove(_proposalId, _account);
    }

    /// @inheritdoc IMultisig
    function canExecute(uint256 _proposalId) external view returns (bool) {
        return _canExecute(_proposalId);
    }

    /// @notice Returns all information for a proposal vote by its ID.
    /// @param _proposalId The ID of the proposal.
    /// @return executed Whether the proposal is executed or not.
    /// @return approvals The number of approvals casted.
    /// @return parameters The parameters of the proposal vote.
    /// @return actions The actions to be executed in the associated DAO after the proposal has passed.
    /// @param allowFailureMap A bitmap allowing the proposal to succeed, even if individual actions might revert. If the bit at index `i` is 1, the proposal succeeds even if the `i`th action reverts. A failure map value of 0 requires every action to not revert.
    function getProposal(
        uint256 _proposalId
    )
        public
        view
        returns (
            bool executed,
            uint16 approvals,
            ProposalParameters memory parameters,
            IDAO.Action[] memory actions,
            uint256 allowFailureMap
        )
    {
        Proposal storage proposal_ = proposals[_proposalId];

        executed = proposal_.executed;
        approvals = proposal_.approvals;
        parameters = proposal_.parameters;
        actions = proposal_.actions;
        allowFailureMap = proposal_.allowFailureMap;
    }

    /// @inheritdoc IMultisig
    function hasApproved(uint256 _proposalId, address _account) public view returns (bool) {
        return proposals[_proposalId].approvers[_account];
    }

    /// @inheritdoc IMultisig
    function execute(uint256 _proposalId) public {
        if (!_canExecute(_proposalId)) {
            revert ProposalExecutionForbidden(_proposalId);
        }

        _execute(_proposalId);
    }

    /// @inheritdoc IMembership
    function isMember(address _account) external view returns (bool) {
        return isListed(_account);
    }

    /// @notice Internal function to execute a vote. It assumes the queried proposal exists.
    /// @param _proposalId The ID of the proposal.
    function _execute(uint256 _proposalId) internal {
        Proposal storage proposal_ = proposals[_proposalId];

        proposal_.executed = true;

        _executeProposal(
            dao(),
            _proposalId,
            proposals[_proposalId].actions,
            proposals[_proposalId].allowFailureMap
        );
    }

    /// @notice Internal function to check if an account can approve. It assumes the queried proposal exists.
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

        return proposal_.approvals >= proposal_.parameters.minApprovals;
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

    /// @notice Internal function to update the plugin settings.
    /// @param _multisigSettings The new settings.
    function _updateMultisigSettings(MultisigSettings calldata _multisigSettings) internal {
        uint16 addresslistLength_ = uint16(addresslistLength());

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
        lastMultisigSettingsChange = block.number.toUint64();

        emit MultisigSettingsUpdated({
            onlyListed: _multisigSettings.onlyListed,
            minApprovals: _multisigSettings.minApprovals
        });
    }

    /// @dev This empty reserved space is put in place to allow future versions to add new
    /// variables without shifting down storage in the inheritance chain.
    /// https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    uint256[47] private __gap;
}
