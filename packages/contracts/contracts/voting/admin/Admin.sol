// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import {PluginCloneable} from "../../core/plugin/PluginCloneable.sol";
import {IDAO} from "../../core/IDAO.sol";

/// @title Admin
/// @author Aragon Association - 2022.
/// @notice The admin address governance plugin giving execution permission on the DAO to a single address
contract Admin is PluginCloneable {
    using Counters for Counters.Counter;

    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 internal constant ADMIN_ADDRESS_INTERFACE_ID =
        this.initialize.selector ^ this.executeProposal.selector;

    /// @notice The ID of the permission required to call the `executeProposal` function.
    bytes32 public constant EXECUTE_PROPOSAL_PERMISSION_ID =
        keccak256("EXECUTE_PROPOSAL_PERMISSION");

    /// @notice The incremental ID for proposals and executions.
    Counters.Counter internal proposalId;

    /// @notice Emitted when a proposal is created.
    /// @param proposalId  The ID of the proposal.
    /// @param creator  The creator of the proposal.
    /// @param metadata The IPFS hash pointing to the proposal metadata.
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        bytes metadata,
        IDAO.Action[] actions
    );

    /// @notice Emitted when a proposal is executed.
    /// @param proposalId  The ID of the proposal.
    /// @param execResults The bytes array resulting from the vote execution in the associated DAO.
    event ProposalExecuted(uint256 indexed proposalId, bytes[] execResults);

    /// @notice Initializes the contract.
    /// @dev This method is required to support [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167).
    /// @param _dao The associated DAO.
    function initialize(IDAO _dao) public initializer {
        __PluginCloneable_init(_dao);
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param interfaceId The ID of the interace.
    /// @return bool Returns true if the interface is supported.
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == ADMIN_ADDRESS_INTERFACE_ID || super.supportsInterface(interfaceId);
    }

    /// @notice Creates and executes a new proposal.
    /// @param _proposalMetadata The IPFS hash pointing to the proposal metadata.
    /// @param _actions The actions to be executed.
    function executeProposal(bytes calldata _proposalMetadata, IDAO.Action[] calldata _actions)
        external
        auth(EXECUTE_PROPOSAL_PERMISSION_ID)
        returns (bytes[] memory)
    {
        // Increment proposalId
        proposalId.increment();

        // Execute
        bytes[] memory execResults = dao.execute(proposalId.current(), _actions);

        // Create proposal
        emit ProposalCreated(proposalId.current(), _msgSender(), _proposalMetadata, _actions);

        // Execute proposal
        emit ProposalExecuted(proposalId.current(), execResults);

        return execResults;
    }
}
