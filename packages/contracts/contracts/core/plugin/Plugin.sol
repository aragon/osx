// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {DaoAuthorizable} from "../component/DaoAuthorizable.sol";
import {IDAO} from "../IDAO.sol";

/// @title Plugin
/// @notice An abstract, non-upgradeable contract to inherit from when creating a plugin being deployed via the `new` keyword.
abstract contract Plugin is ERC165, DaoAuthorizable {
    bytes4 public constant PLUGIN_INTERFACE_ID = type(Plugin).interfaceId;

    /// @notice Initializes the DAO by storing the associated DAO and registering the contract's [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The associated DAO address.
    constructor(IDAO _dao) DaoAuthorizable(_dao) {}

    /// @notice adds a IERC165 to check whether contract supports Plugin interface or not.
    /// @dev See {ERC165Upgradeable-supportsInterface}.
    /// @return bool whether it supports the IERC165 or Plugin
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == PLUGIN_INTERFACE_ID || super.supportsInterface(interfaceId);
    }
}
