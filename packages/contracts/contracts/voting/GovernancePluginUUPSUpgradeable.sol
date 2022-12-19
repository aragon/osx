// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {CountersUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

import {PluginUUPSUpgradeable} from "../core/plugin/PluginUUPSUpgradeable.sol";
import {IDAO} from "../core/IDAO.sol";
import {GovernanceBase} from "./GovernanceBase.sol";

abstract contract GovernancePluginUUPSUpgradeable is GovernanceBase, PluginUUPSUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    /// @notice The incremental ID for proposals and executions.
    CountersUpgradeable.Counter private proposalId;

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
