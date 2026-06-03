// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {Proposal} from "@aragon/osx-commons-contracts/plugin/extensions/proposal/Proposal.sol";
import {Action} from "@aragon/osx-commons-contracts/executors/IExecutor.sol";

/// @notice A mock contract.
/// @dev DO NOT USE IN PRODUCTION!
contract ProposalMock is Proposal {
    // We don't need to test these below functions as they will be tested in the actual plugins.
    // This mock contract is only used to test `supportsInterface` function.

    // solhint-disable no-empty-blocks
    function createProposal(
        bytes memory data,
        Action[] memory actions,
        uint64 startDate,
        uint64 endDate,
        bytes memory
    ) external returns (uint256 proposalId) {}

    function execute(uint256 proposalId) external view {}

    function canExecute(uint256 _proposalId) external view returns (bool) {}

    function hasSucceeded(uint256 proposalId) external view returns (bool) {}

    function customProposalParamsABI() external view returns (string memory) {}
}
