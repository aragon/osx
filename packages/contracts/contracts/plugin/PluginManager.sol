// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {PluginERC1967Proxy} from "../utils/PluginERC1967Proxy.sol";
import {BulkPermissionsLib as Permission} from "../core/permission/BulkPermissionsLib.sol";
import {bytecodeAt} from "../utils/Contract.sol";
import {PluginERC1967Proxy} from "../utils/PluginERC1967Proxy.sol";
import {TransparentProxy} from "../utils/TransparentProxy.sol";
import {PluginUUPSUpgradeable} from "../core/plugin/PluginUUPSUpgradeable.sol";
import {PluginClones} from "../core/plugin/PluginClones.sol";
import {Plugin} from "../core/plugin/Plugin.sol";
import {PluginTransparentUpgradeable} from "../core/plugin/PluginTransparentUpgradeable.sol";

library PluginManagerLib {
    using ERC165Checker for address;
    using Clones for address;

    struct Data {
        Permission.ItemMultiTarget[] permissions;
    }

    function addPermission(
        Data memory self,
        Permission.Operation op,
        address where,
        address who,
        address oracle,
        bytes32 permissionId
    ) internal view {
        Permission.ItemMultiTarget memory newPermission = Permission.ItemMultiTarget(
            op,
            where,
            who,
            oracle,
            permissionId
        );
        Permission.ItemMultiTarget[] memory newPermissions = new Permission.ItemMultiTarget[](
            self.permissions.length + 1
        );

        // TODO: more efficient copy
        for (uint256 i = 0; i < self.permissions.length; i++) {
            newPermissions[i] = self.permissions[i];
        }

        if (self.permissions.length > 0) newPermissions[newPermissions.length - 1] = newPermission;
        else newPermissions[0] = newPermission;

        self.permissions = newPermissions;
    }
}

/// NOTE: This is an untested code and should NOT be used in production.
/// @notice Abstract Plugin Factory that dev's have to inherit from for their factories.
abstract contract PluginManager {
    bytes4 public constant PLUGIN_MANAGER_INTERFACE_ID = type(PluginManager).interfaceId;

    function deploy(address dao, bytes memory data)
        public
        virtual
        returns (
            address plugin,
            address[] memory helpers,
            Permission.ItemMultiTarget[] memory permissions
        );

    function update(
        address dao,
        address plugin, // proxy
        address[] memory helpers,
        bytes memory data,
        uint16[3] calldata oldVersion
    )
        public
        virtual
        returns (
            address[] memory activeHelpers,
            bytes memory initData,
            Permission.ItemMultiTarget[] memory permissions
        )
    {}

    function uninstall(
        address dao,
        address plugin,
        address[] calldata activeHelpers
    ) public virtual returns (Permission.ItemMultiTarget[] memory permissions) {}

    function createERC1967Proxy(
        address _dao,
        address _logic,
        bytes memory _data
    ) internal returns (address payable addr) {
        return payable(address(new PluginERC1967Proxy(_dao, _logic, _data)));
    }

    /// @notice the plugin's base implementation address proxies need to delegate calls.
    /// @return address of the base contract address.
    function getImplementationAddress() public view virtual returns (address);

    /// @notice the ABI in string format that deploy function needs to use.
    /// @return ABI in string format.
    function deployABI() external view virtual returns (string memory);

    /// @notice The ABI in string format that update function needs to use.
    /// @dev Not required to be overriden as there might be no update at all by dev.
    /// @return ABI in string format.
    function updateABI() external view virtual returns (string memory) {}
}
