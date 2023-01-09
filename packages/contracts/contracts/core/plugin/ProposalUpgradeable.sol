// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {CountersUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

import "./GovernanceBase.sol";

/// @title Proposal
/// @author Aragon Association - 2022
/// @notice An abstract contract defining the traits and internal functionality to create and execute proposals for upgradeable contract.
abstract contract ProposalUpgradeable is ProposalBase {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    /// @notice The incremental ID for proposals and executions.
    CountersUpgradeable.Counter private proposalCounter;

    /// @inheritdoc ProposalBase
    function proposalCount() public view override returns (uint256) {
        return proposalCounter.current();
    }

    /// @inheritdoc ProposalBase
    function incrementProposalCounter() public override {
        return proposalCounter.increment();
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[49] private __gap;
}
