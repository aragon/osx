// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import {Plugin} from "../core/plugin/Plugin.sol";
import {IDAO} from "../core/IDAO.sol";

import {GovernanceBase} from "./GovernanceBase.sol";

abstract contract GovernancePlugin is GovernanceBase, Plugin {
    using Counters for Counters.Counter;

    /// @notice The incremental ID for proposals and executions.
    Counters.Counter private proposalId;

    /// @inheritdoc GovernanceBase
    function _createProposal(
        address _creator,
        bytes calldata _metadata,
        IDAO.Action[] calldata _actions
    ) internal virtual override returns (uint256 id) {
        id = proposalId.current();
        proposalId.increment();

        emit ProposalCreated({
            proposalId: id,
            creator: _creator,
            metadata: _metadata,
            actions: _actions
        });

        return id;
    }

    /// @inheritdoc GovernanceBase
    function _executeProposal(uint256 _proposalId, IDAO.Action[] memory _actions)
        internal
        virtual
        override
    {
        bytes[] memory execResults = dao.execute(_proposalId, _actions);
        emit ProposalExecuted({proposalId: _proposalId, execResults: execResults});
    }
}
