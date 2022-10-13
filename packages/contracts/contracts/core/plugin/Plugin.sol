// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {DaoAuthorizableConstructable} from "../component/DaoAuthorizableConstructable.sol";
import {IDAO} from "../IDAO.sol";

/// @title Plugin
/// @author Aragon Association - 2022
/// @notice An abstract, non-upgradeDaoAuthorizableConstructableo inherit from when creating a plugin being deployed via the `new` keyword.
abstract contract Plugin is ERC165, DaoAuthorizableConstructable {
    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 public constant PLUGIN_INTERFACE_ID = type(Plugin).interfaceId;

    /// @notice Constructs the plugin by storing the associated DAO.
    /// @param _dao The DAODaoAuthorizableConstructable
    constructor(IDAO _dao) DaoAuthorizableConstructable(_dao) {}

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interace.
    /// @return bool Returns true if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return _interfaceId == PLUGIN_INTERFACE_ID || super.supportsInterface(_interfaceId);
    }
}
