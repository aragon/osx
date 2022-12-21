// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Plugin} from "../core/plugin/Plugin.sol";
import {IDAO} from "../core/IDAO.sol";
import {IProposal} from "./IProposal.sol";
import {GovernanceBase} from "./GovernanceBase.sol";

abstract contract GovernancePlugin is GovernanceBase, Plugin {
    /// @notice Constructs the plugin by storing the associated DAO.
    /// @param _dao The DAO contract.
    constructor(IDAO _dao) Plugin(_dao) {}

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param interfaceId The ID of the interface.
    /// @return bool Returns `true` if the interface is supported.
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IProposal).interfaceId || super.supportsInterface(interfaceId);
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
