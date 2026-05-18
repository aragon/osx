// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {CountersUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import {IProposal} from "./IProposal.sol";

/// @title ProposalUpgradeable
/// @author Aragon X - 2022-2024
/// @notice An abstract contract containing the traits and internal functionality to create and execute proposals
///         that can be inherited by upgradeable DAO plugins.
/// @custom:security-contact sirt@aragon.org
abstract contract ProposalUpgradeable is IProposal, ERC165Upgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    error FunctionDeprecated();

    /// @notice The incremental ID for proposals and executions.
    CountersUpgradeable.Counter private proposalCounter;

    /// @inheritdoc IProposal
    function proposalCount() public view virtual override returns (uint256) {
        revert FunctionDeprecated();
    }

    /// @notice Creates a proposal Id.
    /// @dev Uses block number and chain id to ensure more probability of uniqueness.
    /// @param _salt The extra salt to help with uniqueness.
    /// @return The id of the proposal.
    function _createProposalId(bytes32 _salt) internal view virtual returns (uint256) {
        return uint256(keccak256(abi.encode(block.chainid, block.number, address(this), _salt)));
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @dev In addition to the current interfaceId, also support previous version of the interfaceId
    ///      that did not include the following functions:
    ///      `createProposal`, `hasSucceeded`, `execute`, `canExecute`, `customProposalParamsABI`.
    /// @param _interfaceId The ID of the interface.
    /// @return Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId ==
            type(IProposal).interfaceId ^
                IProposal.createProposal.selector ^
                IProposal.hasSucceeded.selector ^
                IProposal.execute.selector ^
                IProposal.canExecute.selector ^
                IProposal.customProposalParamsABI.selector ||
            _interfaceId == type(IProposal).interfaceId ||
            super.supportsInterface(_interfaceId);
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables
    ///         without shifting down storage in the inheritance chain
    ///         (see [OpenZeppelin's guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[49] private __gap;
}
