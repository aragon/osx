// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {CountersUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

import {IDAO} from "../IDAO.sol";
import {IProposal} from "./IProposal.sol";

/// @title GovernanceBase
/// @author Aragon Association - 2022
/// @notice An abstract base contract defining the traits and internal functionality of a governance plugin.
abstract contract GovernanceBase is IProposal {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    /// @notice The incremental ID for proposals and executions.
    CountersUpgradeable.Counter private proposalCounter;

    /// @inheritdoc IProposal
    function proposalCount() public view returns (uint256) {
        return proposalCounter.current();
    }

    /// @notice Internal function to create a proposal.
    /// @param _metadata The the proposal metadata.
    /// @param _actions The actions that will be executed after the proposal passes.
    /// @return proposalId The ID of the proposal.
    function _createProposal(
        address _creator,
        bytes calldata _metadata,
        IDAO.Action[] calldata _actions
    ) internal virtual returns (uint256 proposalId) {
        proposalId = proposalCounter.current();
        proposalCounter.increment();

        emit ProposalCreated({
            proposalId: proposalId,
            creator: _creator,
            metadata: _metadata,
            actions: _actions
        });
    }

    /// @notice Internal function to execute a proposal.
    /// @param _proposalId The ID of the proposal to be executed.
    /// @param _actions The array of actions to be executed.
    function _executeProposal(uint256 _proposalId, IDAO.Action[] memory _actions) internal virtual;
}
