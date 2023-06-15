// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {IPermissionCondition} from "./IPermissionCondition.sol";

/// @title PermissionCondition
/// @author Aragon Association - 2021-2023
/// @notice An abstract contract to inherit from and to be be implemented to support more customary permissions depending on on- or off-chain state, e.g., by querying token ownershop or a secondary condition, respectively.
abstract contract PermissionCondition is ERC165, IPermissionCondition {
    /// @notice Checks if an interface is supported by this or its parent contract.
    /// @param _interfaceId The ID of the interface.
    /// @return Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view override returns (bool) {
        return
            _interfaceId == type(IPermissionCondition).interfaceId ||
            super.supportsInterface(_interfaceId);
    }
}
