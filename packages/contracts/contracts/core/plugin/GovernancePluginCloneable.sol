// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IDAO} from "../IDAO.sol";
import {PluginCloneable} from "./PluginCloneable.sol";
import {GovernanceBase} from "./GovernanceBase.sol";
import {IProposal} from "./IProposal.sol";

abstract contract GovernancePluginCloneable is GovernanceBase, PluginCloneable {
    /// @notice Initializes the contract.
    /// @dev This method is required to support [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167).
    /// @param _dao The associated DAO.
    function __GovernancePluginCloneable_init(IDAO _dao) internal virtual onlyInitializing {
        __PluginCloneable_init(_dao);
    }

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
