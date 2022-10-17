// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {IPluginSetup} from "./IPluginSetup.sol";
import {PermissionLib} from "../core/permission/PermissionLib.sol";

/// @title PluginSetup
/// @author Aragon Association - 2022
/// @notice An abstract contract that developers have to inherit from to write the setup of a plugin.
// TODO: GIORGI make IPluginSetup
abstract contract PluginSetup is ERC165, IPluginSetup {
    /// @inheritdoc IPluginSetup
    function prepareUpdateDataABI() external view virtual override returns (string memory) {}

    /// @inheritdoc IPluginSetup
    function prepareUpdate(
        address _dao,
        address _plugin,
        address[] memory _currentHelpers,
        uint16[3] calldata _oldVersion,
        bytes memory _data
    )
        external
        virtual
        override
        returns (
            address[] memory updatedHelpers,
            bytes memory initData,
            PermissionLib.ItemMultiTarget[] memory permissions
        )
    {}

    /// @notice A convenience function to create an [ERC-1967](https://eips.ethereum.org/EIPS/eip-1967) proxy contract pointing to an implementation and being associated to a DAO.
    /// @param _implementation The address of the implementation contract to which the proxy is pointing to.
    /// @param _data The data to initialize the storage of the proxy contract.
    /// @return proxy The address of the created proxy contract.
    function createERC1967Proxy(address _implementation, bytes memory _data)
        internal
        returns (address payable proxy)
    {
        proxy = payable(address(new ERC1967Proxy(_implementation, _data)));
    }

    /// @inheritdoc ERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IPluginSetup).interfaceId || super.supportsInterface(interfaceId);
    }
}
