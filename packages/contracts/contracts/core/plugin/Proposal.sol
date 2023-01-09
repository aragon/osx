// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import "./ProposalBase.sol";

/// @title Proposal
/// @author Aragon Association - 2022
/// @notice An abstract contract defining the traits and internal functionality to create and execute proposals for non-upgradeable contract.
abstract contract Proposal is ProposalBase {
    using Counters for Counters.Counter;

    /// @notice The incremental ID for proposals and executions.
    Counters.Counter private proposalCounter;

    /// @inheritdoc ProposalBase
    function proposalCount() public view override returns (uint256) {
        return proposalCounter.current();
    }

    /// @inheritdoc ProposalBase
    function incrementProposalCounter() public override {
        return proposalCounter.increment();
    }
}
