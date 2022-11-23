// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import {PluginCloneable} from "../../core/plugin/PluginCloneable.sol";
import {IDAO} from "../../core/IDAO.sol";

/// @title AdminAddress
/// @author Aragon Association - 2022.
/// @notice The Admin address governance plugin, to serve as a DAO's primary full controller.
contract AdminAddress is PluginCloneable {
    using Counters for Counters.Counter;

    bytes32 public constant ADMIN_EXECUTE_PERMISSION_ID = keccak256("ADMIN_EXECUTE_PERMISSION");

    /// @notice The incrimental id for proposals and executions.
    Counters.Counter internal proposalId;

    /// @notice Emitted when a proposal is created.
    /// @param proposalId  The ID of the proposal.
    /// @param creator  The creator of the proposal.
    /// @param metadata The IPFS hash pointing to the proposal metadata.
    event ProposalCreated(uint256 indexed proposalId, address indexed creator, bytes metadata);

    /// @notice Emitted when a proposal is executed.
    /// @param proposalId  The ID of the proposal.
    /// @param execResults The bytes array resulting from the vote execution in the associated DAO.
    event ProposalExecuted(uint256 indexed proposalId, bytes[] execResults);

    /// @notice Initializes the contract.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The associated DAO.
    function initialize(IDAO _dao) public initializer {
        __PluginCloneable_init(_dao);
    }

    /// @notice Create and execute a new proposal.
    /// @param _proposalMetadata The IPFS hash pointing to the proposal metadata.
    /// @param _actions The actions that will be executed immediatly.
    function createProposalAndExecute(
        bytes calldata _proposalMetadata,
        IDAO.Action[] calldata _actions
    ) external auth(ADMIN_EXECUTE_PERMISSION_ID) returns (bytes[] memory) {
        // Create proposal
        emit ProposalCreated(proposalId.current(), _msgSender(), _proposalMetadata);

        // Execute
        bytes[] memory execResults = dao.execute(proposalId.current(), _actions);

        emit ProposalExecuted(proposalId.current(), execResults);

        // Increment proposalId
        proposalId.increment();

        return execResults;
    }
}
