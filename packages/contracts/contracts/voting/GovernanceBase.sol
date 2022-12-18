// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IDAO} from "../core/IDAO.sol";

abstract contract GovernanceBase {
    /// @notice Emitted when a proposal is created.
    /// @param proposalId The ID of the proposal.
    /// @param creator  The creator of the proposal.
    /// @param metadata The metadata of the proposal.
    /// @param actions The actions that will be executed if the proposal passes.
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        bytes metadata,
        IDAO.Action[] actions
    );

    /// @notice Emitted when a proposal is executed.
    /// @param proposalId The ID of the proposal.
    // /// @param execResults The bytes array resulting from the proposal execution in the associated DAO.
    event ProposalExecuted(uint256 indexed proposalId); //, bytes[] execResults);

    /// @notice Internal function to create a proposal.
    /// @param _metadata The the proposal metadata.
    /// @param _actions The actions that will be executed after the proposal passes.
    /// @return id The ID of the proposal.
    function _createProposal(
        address _creator,
        bytes calldata _metadata,
        IDAO.Action[] calldata _actions
    ) internal virtual returns (uint256) {}

    /// @notice Internal function to execute a proposal.
    /// @param _proposalId The ID of the proposal to be executed.
    /// @param _actions The array of actions.
    function _executeProposal(uint256 _proposalId, IDAO.Action[] memory _actions) internal virtual;
}
