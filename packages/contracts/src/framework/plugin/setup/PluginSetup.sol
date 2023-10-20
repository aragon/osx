// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {IProtocolVersion, ProtocolVersion} from "../../../utils/protocol/ProtocolVersion.sol";
import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
import {IPluginSetup} from "./IPluginSetup.sol";

/// @title PluginSetup
/// @author Aragon Association - 2022-2023
/// @notice An abstract contract that developers have to inherit from to write the setup of a plugin.
/// @custom:security-contact sirt@aragon.org
abstract contract PluginSetup is ERC165, IPluginSetup, ProtocolVersion {
    using Clones for address;

    /// @notice Thrown when trying to update a non-upgradeable plugin.
    error UpdatesUnsupported();

    /// @notice The address of plugin implementation contract to create [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167) clones from.
    address public immutable implementation;

    /// @notice The contract constructor, that deploys the `Multisig` plugin logic contract.
    constructor(address _implementation) {
        implementation = _implementation;
    }

    /// @inheritdoc IPluginSetup
    function prepareUpdate(
        address,
        uint16,
        SetupPayload calldata
    ) external pure override returns (bytes memory, PreparedSetupData memory) {
        revert UpdatesUnsupported();
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interface.
    /// @return Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == type(IPluginSetup).interfaceId ||
            _interfaceId == type(IProtocolVersion).interfaceId ||
            super.supportsInterface(_interfaceId);
    }
}
