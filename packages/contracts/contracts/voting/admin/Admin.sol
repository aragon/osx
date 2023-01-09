// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {CountersUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

import {GovernancePluginCloneable} from "../../core/plugin/GovernancePluginCloneable.sol";
import {IDAO} from "../../core/IDAO.sol";

/// @title Admin
/// @author Aragon Association - 2022.
/// @notice The admin address governance plugin giving execution permission on the DAO to a single address.
contract Admin is GovernancePluginCloneable {
    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 internal constant ADMIN_ADDRESS_INTERFACE_ID =
        this.initialize.selector ^ this.proposalCount.selector ^ this.executeProposal.selector;

    /// @notice The ID of the permission required to call the `executeProposal` function.
    bytes32 public constant EXECUTE_PROPOSAL_PERMISSION_ID =
        keccak256("EXECUTE_PROPOSAL_PERMISSION");

    /// @notice Initializes the contract.
    /// @dev This method is required to support [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167).
    /// @param _dao The associated DAO.
    function initialize(IDAO _dao) public initializer {
        __GovernancePluginCloneable_init(_dao);
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param interfaceId The ID of the interface.
    /// @return bool Returns `true` if the interface is supported.
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == ADMIN_ADDRESS_INTERFACE_ID || super.supportsInterface(interfaceId);
    }

    /// @notice Creates and executes a new proposal.
    /// @param _metadata The metadata of the proposal.
    /// @param _actions The actions to be executed.
    function executeProposal(
        bytes calldata _metadata,
        IDAO.Action[] calldata _actions
    ) external auth(EXECUTE_PROPOSAL_PERMISSION_ID) {
        uint256 proposalId = _createProposal(_msgSender(), _metadata, _actions);
        _executeProposal(proposalId, _actions);
    }
}
