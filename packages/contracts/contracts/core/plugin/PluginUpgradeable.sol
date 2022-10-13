// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import {DaoAuthorizableUpgradeable} from "../component/DaoAuthorizableUpgradeable.sol";
import {IDAO} from "../IDAO.sol";

/// @title PluginUpgradeable
/// @author Aragon Association - 2022
/// @notice An abstract, upgradeable contract to inherit from when creating a plugin being deployed via the transparent proxy pattern (see [OpenZepplin's article](https://blog.openzeppelin.com/the-transparent-proxy-pattern/)).
abstract contract PluginUpgradeable is ERC165Upgradeable, DaoAuthorizableUpgradeable {
    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 public constant PLUGIN_UPGRADEABLE_INTERFACE_ID = type(PluginUpgradeable).interfaceId;

    // NOTE: When adding new state variables to the contract, the size of `_gap` has to be adapted below as well.

    /// @notice Initializes the plugin by storing the associated DAO.
    /// @param _dao The DAO contract.
    function __PluginUpgradeable_init(IDAO _dao) internal virtual onlyInitializing {
        __DaoAuthorizableUpgradeable_init(_dao);
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interace.
    /// @return bool Returns true if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == PLUGIN_UPGRADEABLE_INTERFACE_ID ||
            super.supportsInterface(_interfaceId);
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[50] private __gap;
}
