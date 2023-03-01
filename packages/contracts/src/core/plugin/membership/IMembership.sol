// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {IDAO} from "../../dao/IDAO.sol";

/// @title IProposal
/// @author Aragon Association - 2022-2023
/// @notice An interface to be implemented by DAO plugins that define membership.
interface IMembership {
    /// @notice Emitted when members are added to the DAO plugin.
    /// @param members The list of new members being added.
    event MembersAdded(address[] members);

    /// @notice Emitted when members are removed from the DAO plugin.
    /// @param members The list of existing members being removed.
    event MembersRemoved(address[] members);

    /// @notice Emitted to announce the membership being defined by a contract.
    /// @param definingContract The contract defining the membership.
    event MembershipContractAnnounced(address indexed definingContract);

    /// @notice Checks if an account is a member of the DAO.
    /// @param _account The address of the account to be checked.
    /// @return Whether the account is a member or not.
    /// @dev This function must be implemented in the plugin contract that introduces the members to the DAO.
    function isMember(address _account) external view returns (bool);
}
