// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {CountersUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

import {IDAO} from "../IDAO.sol";
import {PluginUUPSUpgradeable} from "./PluginUUPSUpgradeable.sol";
import {GovernanceBase} from "./GovernanceBase.sol";
import {IProposal} from "./IProposal.sol";

/// @title GovernancePluginUUPSUpgradeable
/// @author Aragon Association - 2022
/// @notice An abstract, upgradeable contract to inherit from when creating a governance plugin being deployed via the UUPS pattern (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
abstract contract GovernancePluginUUPSUpgradeable is PluginUUPSUpgradeable, GovernanceBase {
    /// @notice Initializes the contract.
    /// @dev This method is required to support [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167).
    /// @param _dao The associated DAO.
    function __GovernancePluginUUPSUpgradeable_init(IDAO _dao) internal virtual onlyInitializing {
        __PluginUUPSUpgradeable_init(_dao);
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

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[49] private __gap;
}
