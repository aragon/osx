/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "../core/erc165/AdaptiveERC165.sol";

library PluginFactoryIDs {
    bytes4 public constant PLUGIN_FACTORY_INTERFACE_ID = type(PluginFactoryBase).interfaceId;
}

/// @title PluginFactoryBase
/// @author Aragon Association - 2022
/// @notice The abstract base contract of the plugin factory.
abstract contract PluginFactoryBase is AdaptiveERC165 {
    address internal basePluginAddress;

    constructor() {
        _registerStandard(PluginFactoryIDs.PLUGIN_FACTORY_INTERFACE_ID);
    }

    /// @dev Required to handle the the deployment of a plugin
    /// @param _dao The address of the dao where the plugin will be installed
    /// @param _params The encoded params needed for deploy a plugin
    /// @return pluginAddress The the address of the deployed plugin
    function deploy(address _dao, bytes calldata _params)
        external
        virtual
        returns (address pluginAddress);

    /// @dev Retruns the basePluginAddress
    /// @return address The the address of the base plugin
    function getBasePluginAddress() external view returns (address) {
        return basePluginAddress;
    }
}
