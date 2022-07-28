/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "../core/erc165/AdaptiveERC165.sol";

/// @notice A library to share the interface ID of the abstract `PluginFactoryBase` contract.
library PluginFactoryIDs {
    /// @notice The interface ID of the `PluginFactoryBase` contract.
    bytes4 public constant PLUGIN_FACTORY_INTERFACE_ID = type(PluginFactoryBase).interfaceId;
}

/// @title PluginFactoryBase
/// @author Aragon Association - 2022
/// @notice The abstract base contract for plugin factories to inherit from.
abstract contract PluginFactoryBase is AdaptiveERC165 {
    /// @notice The base plugin address to clone from.
    address internal basePluginAddress;

    /// @notice Initializes the plugin factory by registering its [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID.
    constructor() {
        _registerStandard(PluginFactoryIDs.PLUGIN_FACTORY_INTERFACE_ID);
    }

    /// @notice Deploys a plugin.
    /// @param _dao The address of the DAO where the plugin will be installed.
    /// @param _params The encoded paramaters needed for the plugin deployment.
    /// @return pluginAddress The the address of the deployed plugin.
    function deploy(address _dao, bytes calldata _params)
        external
        virtual
        returns (address pluginAddress);

    /// @notice Retruns the address of the base plugin.
    /// @return address The the address of the base plugin.
    function getBasePluginAddress() external view returns (address) {
        return basePluginAddress;
    }
}
