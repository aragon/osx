// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {IProposal} from "./IProposal.sol";

/// @title Proposal
/// @author Aragon X - 2022-2024
/// @notice An abstract contract containing the traits and internal functionality to create and execute proposals
///         that can be inherited by non-upgradeable DAO plugins.
/// @custom:security-contact sirt@aragon.org
abstract contract Proposal is IProposal, ERC165 {
    error FunctionDeprecated();

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
}
