// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

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

    /// @inheritdoc ERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == PLUGIN_INTERFACE_ID || super.supportsInterface(interfaceId);
    }
}
