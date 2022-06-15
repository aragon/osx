/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "../core/erc165/AdaptiveERC165.sol";

library PluginFactoryIDs {
    bytes4 public constant PLUGIN_FACTORY_INTERFACE_ID = type(IPluginFactory).interfaceId;
}

/// @title The interface required for plugin factory
/// @author Sarkawt Noori - Aragon Association - 2022
abstract contract IPluginFactory is AdaptiveERC165 {
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
}
