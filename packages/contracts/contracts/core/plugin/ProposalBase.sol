// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IDAO} from "../IDAO.sol";

/// @title ProposalBase
/// @author Aragon Association - 2022
/// @notice An abstract base contract defining the traits and internal functionality to create and execute proposals.
abstract contract ProposalBase {
    /// @notice Emitted when a proposal is created.
    /// @param proposalId The ID of the proposal.
    /// @param creator  The creator of the proposal.
    /// @param startDate The start date of the proposal in seconds.
    /// @param endDate The end date of the proposal in seconds.
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

    /// @notice Returns the proposal count determining the next proposal ID.
    /// @return The proposal count.
    function proposalCount() public view virtual returns (uint256);

    /// @notice Creates a proposal ID.
    /// @return The proposal ID.
    function createProposalId() internal virtual returns (uint256);

    /// @notice Internal function to create a proposal.
    /// @param _metadata The the proposal metadata.
    /// @param _startDate The start date of the proposal in seconds.
    /// @param _endDate The end date of the proposal in seconds.
    /// @param _actions The actions that will be executed after the proposal passes.
    /// @return proposalId The ID of the proposal.
    function _createProposal(
        address _creator,
        bytes calldata _metadata,
        uint64 _startDate,
        uint64 _endDate,
        IDAO.Action[] calldata _actions
    ) internal virtual returns (uint256 proposalId) {
        proposalId = createProposalId();

        emit ProposalCreated({
            proposalId: proposalId,
            creator: _creator,
            metadata: _metadata,
            startDate: _startDate,
            endDate: _endDate,
            actions: _actions
        });
    }

    /// @notice Internal function to execute a proposal.
    /// @param _proposalId The ID of the proposal to be executed.
    /// @param _actions The array of actions to be executed.
    function _executeProposal(
        IDAO _dao,
        uint256 _proposalId,
        IDAO.Action[] memory _actions
    ) internal virtual {
        (bytes[] memory execResults, ) = _dao.execute(bytes32(_proposalId), _actions, 0);
        emit ProposalExecuted({proposalId: _proposalId, execResults: execResults});
    }
}
