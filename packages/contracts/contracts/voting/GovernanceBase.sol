// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IDAO} from "../core/IDAO.sol";
import {IProposal} from "./IProposal.sol";

abstract contract GovernanceBase is IProposal {
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
