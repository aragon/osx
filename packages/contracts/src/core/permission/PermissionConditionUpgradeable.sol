// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import {IPermissionCondition} from "./IPermissionCondition.sol";

/// @title PermissionConditionUpgradeable
/// @author Aragon Association - 2023
/// @notice An abstract contract for upgradeable or cloneable contracts to inherit from and to support customary permissions depending on arbitrary on-chain state.
abstract contract PermissionConditionUpgradeable is ERC165Upgradeable, IPermissionCondition {
    /// @notice Checks if an interface is supported by this or its parent contract.
    /// @param _interfaceId The ID of the interface.
    /// @return Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == type(IPermissionCondition).interfaceId ||
            super.supportsInterface(_interfaceId);
    }
}
