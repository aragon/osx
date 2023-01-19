// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IDAO} from "../IDAO.sol";

/// @notice An interface to be used by DAO plugins that define membership by announcing and renouncing individual addresses.
interface IMembership {
    /// @notice Emitted to announce the membership of new members.
    /// @param members The list of new members.
    event MembershipAnnounced(address[] members);

    /// @notice Emitted to renounce the membership of existing members.
    /// @param members The list of exisiting members.
    event MembershipRenounced(address[] members);
}
