// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginERC1967Proxy} from "../utils/PluginERC1967Proxy.sol";
import {BulkPermissionsLib as Permission} from "../core/permission/BulkPermissionsLib.sol";

/// NOTE: This is an untested code and should NOT be used in production.
/// @notice Abstract Plugin Factory that dev's have to inherit from for their factories.
abstract contract PluginManager {
    bytes4 public constant PLUGIN_MANAGER_INTERFACE_ID = type(PluginManager).interfaceId;

    /// @notice helper function to deploy Custom ERC1967Proxy that includes dao slot on it.
    /// @param dao dao address
    /// @param logic the base contract address proxy has to delegate calls to.
    /// @param init the initialization data(function selector + encoded data)
    /// @return address of the proxy.
    function createProxy(
        address dao,
        address logic,
        bytes memory init
    ) internal returns (address) {
        return address(new PluginERC1967Proxy(dao, logic, init));
    }

    /// @notice helper function to deploy Custom ERC1967Proxy that includes dao slot on it.
    /// @param proxy proxy address
    /// @param logic the base contract address proxy has to delegate calls to.
    /// @param init the initialization data(function selector + encoded data)
    function upgrade(
        address proxy,
        address logic,
        bytes memory init
    ) internal {
        // TODO: shall we implement this ?
    }


    /// @notice the function dev has to override/implement for the plugin deployment.
    /// @param dao dao address where plugin will be installed to in the end.
    /// @param data the ABI encoded data that deploy needs for its work.
    /// @return plugin the plugin address
    /// @return permissions array of permissions that will be applied through plugin installations.
    function deploy(address dao, bytes memory data)
        public
        virtual
        returns (address plugin, Permission.ItemMultiTarget[] memory permissions);

    /// @notice the function dev has to override/implement for the plugin update.
    /// @param dao proxy address
    /// @param proxy proxy address
    /// @param oldVersion the version plugin is updating from.
    /// @param data the other data that deploy needs.
    /// @return permissions array of permissions that will be applied through plugin installations.
    function update(
        address dao,
        address proxy,
        uint16[3] calldata oldVersion,
        bytes memory data
    ) public virtual returns (Permission.ItemMultiTarget[] memory permissions) {}

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
