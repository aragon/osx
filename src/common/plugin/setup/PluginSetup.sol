// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {IProtocolVersion} from "../../utils/versioning/IProtocolVersion.sol";
import {ProtocolVersion} from "../../utils/versioning/ProtocolVersion.sol";
import {IPluginSetup} from "./IPluginSetup.sol";

/// @title PluginSetup
/// @author Aragon X - 2022-2024
/// @notice An abstract contract to inherit from to implement the plugin setup for non-upgradeable plugins, i.e,
/// - `Plugin` being deployed via the `new` keyword
/// - `PluginCloneable` being deployed via the minimal proxy pattern (see [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167)).
/// @custom:security-contact sirt@aragon.org
abstract contract PluginSetup is ERC165, IPluginSetup, ProtocolVersion {
    /// @notice The address of the plugin implementation contract for initial block explorer verification and, in the case of `PluginClonable` implementations, to create [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167) clones from.
    address internal immutable IMPLEMENTATION;

    /// @notice Thrown when attempting to prepare an update on a non-upgradeable plugin.
    error NonUpgradeablePlugin();

    /// @notice The contract constructor, that setting the plugin implementation contract.
    /// @param _implementation The address of the plugin implementation contract.
    constructor(address _implementation) {
        IMPLEMENTATION = _implementation;
    }

    /// @inheritdoc IPluginSetup
    /// @dev Since the underlying plugin is non-upgradeable, this non-virtual function must always revert.
    function prepareUpdate(
        address _dao,
        uint16 _fromBuild,
        SetupPayload calldata _payload
    ) external returns (bytes memory, PreparedSetupData memory) {
        (_dao, _fromBuild, _payload);
        revert NonUpgradeablePlugin();
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

    /// @inheritdoc IPluginSetup
    function implementation() public view returns (address) {
        return IMPLEMENTATION;
    }
}
