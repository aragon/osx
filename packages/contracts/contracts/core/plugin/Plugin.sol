// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/Context.sol";

import {_auth} from "../../utils/auth.sol";
import {AppStorage} from "../../utils/AppStorage.sol";

import {IDAO} from "../IDAO.sol";

/// @title Plugin
/// @notice An abstract, non-upgradeable contract to inherit from when creating a plugin being deployed via the `new` keyword.
abstract contract Plugin is ERC165, Context, AppStorage {
    bytes4 public constant PLUGIN_INTERFACE_ID = type(Plugin).interfaceId;

    /// @notice Initializes the DAO by storing the associated DAO and registering the contract's [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The associated DAO address.
    constructor(IDAO _dao) {
        setDAO(address(_dao));
    }

    /// @notice A modifier to be used to check permissions on a target contract via the associated DAO.
    /// @param _permissionId The permission identifier required to call the method this modifier is applied to.
    modifier auth(bytes32 _permissionId) {
        _auth(getDao(), address(this), _msgSender(), _permissionId, _msgData());
        _;
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interace.
    /// @return bool Returns true if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return _interfaceId == PLUGIN_INTERFACE_ID || super.supportsInterface(_interfaceId);
    }
}
