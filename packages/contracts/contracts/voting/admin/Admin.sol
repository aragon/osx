// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

import {PluginCloneable} from "../../core/plugin/PluginCloneable.sol";
import {Proposal} from "../../core/plugin/Proposal.sol";
import {IMembership} from "../../core/plugin/IMembership.sol";
import {IDAO} from "../../core/IDAO.sol";

/// @title Admin
/// @author Aragon Association - 2022-2023.
/// @notice The admin governance plugin giving execution permission on the DAO to a single address.
contract Admin is IMembership, PluginCloneable, Proposal {
    using SafeCast for uint256;

    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 internal constant ADMIN_INTERFACE_ID =
        this.initialize.selector ^ this.executeProposal.selector;

    /// @notice The ID of the permission required to call the `executeProposal` function.
    bytes32 public constant EXECUTE_PROPOSAL_PERMISSION_ID =
        keccak256("EXECUTE_PROPOSAL_PERMISSION");

    /// @notice Initializes the contract.
    /// @param _dao The associated DAO.
    /// @param _admin The address of the admin to be announced as a DAO member.
    /// @dev This method is required to support [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167).
    function initialize(IDAO _dao, address _admin) public initializer {
        __PluginCloneable_init(_dao);

        address[] memory members = new address[](1);
        members[0] = _admin;
        emit MembersAdded({members: members});
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param interfaceId The ID of the interface.
    /// @return bool Returns `true` if the interface is supported.
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == ADMIN_INTERFACE_ID || PluginCloneable.supportsInterface(interfaceId);
    }

    /// @notice Creates and executes a new proposal.
    /// @param _metadata The metadata of the proposal.
    /// @param _actions The actions to be executed.
    function executeProposal(
        bytes calldata _metadata,
        IDAO.Action[] calldata _actions
    ) external auth(EXECUTE_PROPOSAL_PERMISSION_ID) {
        uint64 currentTimestamp64 = block.timestamp.toUint64();

        uint256 proposalId = _createProposal({
            _creator: _msgSender(),
            _metadata: _metadata,
            _startDate: currentTimestamp64,
            _endDate: currentTimestamp64,
            _actions: _actions
        });
        _executeProposal(dao, proposalId, _actions);
    }
}
