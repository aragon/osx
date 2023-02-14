// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import {IDAO} from "../../../core/dao/IDAO.sol";

/// @title IMultisig
/// @author Aragon Association - 2023
/// @notice An interface for an on-chain multisig governance plugin in which a proposal passes if X out of Y approvals are met.
interface IMultisig {
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

    /// @notice Adds new members to the address list and updates the minimum approval parameter.
    /// @param _members The addresses of the members to be added.
    function addAddresses(address[] calldata _members) external;

    /// @notice Removes existing members from the address list. Previously, it checks if the new address list length at least as long as the minimum approvals parameter requires. Note that `minApprovals` is must be at least 1 so the address list cannot become empty.
    /// @param _members The addresses of the members to be removed.
    function removeAddresses(address[] calldata _members) external;

    /// @notice Updates the plugin settings.
    /// @param _multisigSettings The new settings.
    function updateMultisigSettings(MultisigSettings calldata _multisigSettings) external;

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
    ) external returns (uint256 proposalId);

    /// @notice Approves and, optionally, executes the proposal.
    /// @param _proposalId The ID of the proposal.
    /// @param _tryExecution If `true`, execution is tried after the approval cast. The call does not revert if execution is not possible.
    function approve(uint256 _proposalId, bool _tryExecution) external;

    /// @notice Checks if an account can participate on a proposal vote. This can be because the vote
    /// - was executed, or
    /// - the voter is not listed.
    /// @param _proposalId The proposal Id.
    /// @param _account The address of the user to check.
    /// @return bool Returns true if the account is allowed to vote.
    /// @dev The function assumes the queried proposal exists.
    function canApprove(uint256 _proposalId, address _account) external view returns (bool);

    /// @notice Checks if a proposal can be executed.
    /// @param _proposalId The ID of the proposal to be checked.
    /// @return True if the proposal can be executed, false otherwise.
    function canExecute(uint256 _proposalId) external view returns (bool);

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
        external
        view
        returns (
            bool executed,
            uint16 approvals,
            ProposalParameters memory parameters,
            IDAO.Action[] memory actions,
            uint256 allowFailureMap
        );

    /// @notice Returns whether the account has approved the proposal. Note, that this does not check if the account is listed.
    /// @param _proposalId The ID of the proposal.
    /// @param _account The account address to be checked.
    /// @return The vote option cast by a voter for a certain proposal.
    function hasApproved(uint256 _proposalId, address _account) external view returns (bool);

    /// @notice Executes a proposal.
    /// @param _proposalId The ID of the proposal to be executed.
    function execute(uint256 _proposalId) external;
}
