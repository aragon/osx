// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

import {_auth} from "../../utils/auth.sol";
import {AppStorage} from "../../utils/AppStorage.sol";
import {IDAO} from "../IDAO.sol";

/// @title PluginTranparentUpgradeable
/// @notice An abstract contract to inherit from when creating a proxy contract.
/// This should be used to deploy logic contracts where proxy itself
/// is deployed through transparent or beacon...
abstract contract PluginTransparentUpgradeable is
    Initializable,
    ERC165Upgradeable,
    ContextUpgradeable,
    AppStorage
{
    bytes4 public constant PLUGIN_TRANSPARENT_UPGRADEABLE_INTERFACE_ID =
        type(PluginTransparentUpgradeable).interfaceId;

    /// @dev Auth modifier used in all components of a DAO to check the permissions.
    /// @param _permissionId The hash of the permission identifier
    modifier auth(bytes32 _permissionId) {
        IDAO dao = getDao();
        _auth(dao, address(this), _msgSender(), _permissionId, _msgData());
        _;
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interace.
    /// @return bool Returns true if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == PLUGIN_TRANSPARENT_UPGRADEABLE_INTERFACE_ID ||
            super.supportsInterface(_interfaceId);
    }

    /// @dev This empty reserved space is put in place to allow future versions to add new
    /// variables without shifting down storage in the inheritance chain.
    /// https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    uint256[50] private __gap;
}
