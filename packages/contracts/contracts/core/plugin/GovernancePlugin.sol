// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IDAO} from "../IDAO.sol";
import {Plugin} from "./Plugin.sol";
import {GovernanceBase} from "./GovernanceBase.sol";
import {IProposal} from "./IProposal.sol";

/// @title GovernancePlugin
/// @author Aragon Association - 2022
/// @notice An abstract, non-upgradeable inherit from when creating a governance plugin being deployed via the `new` keyword.
abstract contract GovernancePlugin is Plugin, GovernanceBase {
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
