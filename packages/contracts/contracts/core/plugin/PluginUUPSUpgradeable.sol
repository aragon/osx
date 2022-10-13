// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {DaoAuthorizableUpgradeable} from "../component/DaoAuthorizableUpgradeable.sol";
import {IDAO} from "../IDAO.sol";
import {PluginUpgradeable} from "./PluginUpgradeable.sol";

/// @title PluginUUPSUpgradeable
/// @notice An abstract, upgradeable contract to inherit from when creating a plugin being deployed via the UUPS pattern (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
abstract contract PluginUUPSUpgradeable is PluginUpgradeable, UUPSUpgradeable {
    bytes4 public constant PLUGIN_UUPS_UPGRADEABLE_INTERFACE_ID =
        type(PluginUUPSUpgradeable).interfaceId;
    bytes32 public constant UPGRADE_PERMISSION_ID = keccak256("UPGRADE_PERMISSION");

    // NOTE: When adding new state variables to the contract, the size of `_gap` has to be adapted below as well.

    /// @dev Used to check the permissions within the upgradability pattern implementation of OZ
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_PERMISSION_ID) {}

    /// @inheritdoc PluginUpgradeable
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == PLUGIN_UUPS_UPGRADEABLE_INTERFACE_ID ||
            super.supportsInterface(interfaceId);
    }

    /// @notice used to check the current base logic contract proxy delegates to.
    /// @return address the address of current base logic contract.
    function getImplementationAddress() public view returns (address) {
        return _getImplementation();
    }

    /// @dev This empty reserved space is put in place to allow future versions to add new
    /// variables without shifting down storage in the inheritance chain.
    /// https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    uint256[50] private __gap;
}
