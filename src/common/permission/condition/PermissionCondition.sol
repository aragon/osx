// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {IProtocolVersion} from "../../utils/versioning/IProtocolVersion.sol";
import {ProtocolVersion} from "../../utils/versioning/ProtocolVersion.sol";
import {IPermissionCondition} from "./IPermissionCondition.sol";

/// @title PermissionCondition
/// @author Aragon X - 2023
/// @notice An abstract contract for non-upgradeable contracts instantiated via the `new` keyword  to inherit from to support customary permissions depending on arbitrary on-chain state.
/// @custom:security-contact sirt@aragon.org
abstract contract PermissionCondition is ERC165, IPermissionCondition, ProtocolVersion {
    /// @notice Checks if an interface is supported by this or its parent contract.
    /// @param _interfaceId The ID of the interface.
    /// @return Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == type(IPermissionCondition).interfaceId ||
            _interfaceId == type(IProtocolVersion).interfaceId ||
            super.supportsInterface(_interfaceId);
    }
}
