// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {IProtocolVersion} from "../../utils/versioning/IProtocolVersion.sol";
import {ProtocolVersion} from "../../utils/versioning/ProtocolVersion.sol";
import {IPluginSetup} from "./IPluginSetup.sol";

/// @title PluginUpgradeableSetup
/// @author Aragon X - 2022-2024
/// @notice An abstract contract to inherit from to implement the plugin setup for upgradeable plugins, i.e, `PluginUUPSUpgradeable` being deployed via the UUPS pattern (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822) and [ERC-1967](https://eips.ethereum.org/EIPS/eip-1967)).
/// @custom:security-contact sirt@aragon.org
abstract contract PluginUpgradeableSetup is ERC165, IPluginSetup, ProtocolVersion {
    /// @notice The address of the plugin implementation contract for initial block explorer verification
    /// and to create [ERC-1967](https://eips.ethereum.org/EIPS/eip-1967) UUPS proxies from.
    address internal immutable IMPLEMENTATION;

    /// @notice Thrown when an update path is not available, for example, if this is the initial build.
    /// @param fromBuild The build number to update from.
    /// @param thisBuild The build number of this setup to update to.
    error InvalidUpdatePath(uint16 fromBuild, uint16 thisBuild);

    /// @notice The contract constructor, that setting the plugin implementation contract.
    /// @param _implementation The address of the plugin implementation contract.
    constructor(address _implementation) {
        IMPLEMENTATION = _implementation;
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
