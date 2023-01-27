// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import {IDAO} from "../IDAO.sol";

/// @notice An interface to be used by DAO plugins that define membership by adding and removing individual addresses.
interface IMembership {
    /// @notice Emitted when members are added to the DAO plugin.
    /// @param members The list of new members being added.
    event MembersAdded(address[] members);

    /// @notice Emitted when members are removed from the DAO plugin.
    /// @param members The list of existing members being removed.
    event MembersRemoved(address[] members);
}
