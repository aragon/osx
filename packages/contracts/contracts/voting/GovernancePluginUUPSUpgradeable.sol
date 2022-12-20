// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {CountersUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

import {PluginUUPSUpgradeable} from "../core/plugin/PluginUUPSUpgradeable.sol";
import {IDAO} from "../core/IDAO.sol";
import {IProposal} from "./IProposal.sol";
import {GovernanceBase} from "./GovernanceBase.sol";

abstract contract GovernancePluginUUPSUpgradeable is GovernanceBase, PluginUUPSUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 internal constant GOVERNANCE_INTERFACE_ID = type(IProposal).interfaceId;

    /// @notice The incremental ID for proposals and executions.
    CountersUpgradeable.Counter private proposalCounter;

    /// @inheritdoc IProposal
    function proposalCount() external view returns (uint256) {
        return proposalCounter.current();
    }

    /// @notice Initializes the contract.
    /// @dev This method is required to support [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167).
    /// @param _dao The associated DAO.
    function __GovernancePluginUUPSUpgradeable_init(IDAO _dao) internal virtual onlyInitializing {
        __PluginUUPSUpgradeable_init(_dao);
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param interfaceId The ID of the interace.
    /// @return bool Returns true if the interface is supported.
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == GOVERNANCE_INTERFACE_ID || super.supportsInterface(interfaceId);
    }

    /// @inheritdoc GovernanceBase
    function _createProposal(
        address _creator,
        bytes calldata _metadata,
        IDAO.Action[] calldata _actions
    ) internal virtual override returns (uint256 proposalId) {
        proposalId = proposalCounter.current();
        proposalCounter.increment();

        emit ProposalCreated({
            proposalId: proposalId,
            creator: _creator,
            metadata: _metadata,
            actions: _actions
        });
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
