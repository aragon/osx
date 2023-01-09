// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import {PluginCloneable} from "../../core/plugin/PluginCloneable.sol";
import {IDAO} from "../../core/IDAO.sol";

/// @title Admin
/// @author Aragon Association - 2022.
/// @notice The admin address governance plugin giving execution permission on the DAO to a single address.
contract Admin is PluginCloneable {
    using Counters for Counters.Counter;

    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 internal constant ADMIN_ADDRESS_INTERFACE_ID =
        this.initialize.selector ^ this.proposalCount.selector ^ this.executeProposal.selector;

    /// @notice The ID of the permission required to call the `executeProposal` function.
    bytes32 public constant EXECUTE_PROPOSAL_PERMISSION_ID =
        keccak256("EXECUTE_PROPOSAL_PERMISSION");

    /// @notice The incremental ID for proposals and executions.
    Counters.Counter private proposalCounter;

    /// @notice Emitted when a proposal is created.
    /// @param proposalId The ID of the proposal.
    /// @param creator  The creator of the proposal.
    /// @param metadata The metadata of the proposal.
    /// @param actions The actions that will be executed if the proposal passes.
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        bytes metadata,
        IDAO.Action[] actions
    );

    /// @notice Emitted when a proposal is executed.
    /// @param proposalId The ID of the proposal.
    /// @param execResults The bytes array resulting from the proposal execution in the associated DAO.
    event ProposalExecuted(uint256 indexed proposalId, bytes[] execResults);

    /// @notice Initializes the contract.
    /// @dev This method is required to support [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167).
    /// @param _dao The associated DAO.
    function initialize(IDAO _dao) public initializer {
        __PluginCloneable_init(_dao);
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param interfaceId The ID of the interface.
    /// @return bool Returns `true` if the interface is supported.
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == ADMIN_ADDRESS_INTERFACE_ID || super.supportsInterface(interfaceId);
    }

    /// @notice Returns the proposal count determining the next proposal ID.
    /// @return The proposal count.
    function proposalCount() public view returns (uint256) {
        return proposalCounter.current();
    }

    /// @notice Creates and executes a new proposal.
    /// @param _metadata The metadata of the proposal.
    /// @param _actions The actions to be executed.
    function executeProposal(bytes calldata _metadata, IDAO.Action[] calldata _actions)
        external
        auth(EXECUTE_PROPOSAL_PERMISSION_ID)
    {
        uint256 proposalId = proposalCounter.current();
        proposalCounter.increment();

        bytes[] memory execResults = dao.execute(proposalId, _actions, 0); // TODO: 123

        emit ProposalCreated({
            proposalId: proposalId,
            creator: _msgSender(),
            metadata: _metadata,
            actions: _actions
        });
        emit ProposalExecuted({proposalId: proposalId, execResults: execResults});
    }
}
