// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IDAO} from "../core/IDAO.sol";

interface IProposal {
    /// @notice Returns the proposal count determining the next proposal ID.
    /// @return The proposal count.
    function proposalCount() external view returns (uint256);

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
    /// @param execResults The bytes array resulting from the proposal execution in the associated DAO.
    event ProposalExecuted(uint256 indexed proposalId, bytes[] execResults);
}
