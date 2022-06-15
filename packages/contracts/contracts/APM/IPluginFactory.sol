/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "../core/erc165/AdaptiveERC165.sol";

library PluginFactoryIDs {
    bytes4 public constant PLUGIN_FACTORY_INTERFACE_ID = type(IPluginFactory).interfaceId;
}

abstract contract IPluginFactory is AdaptiveERC165 {
    constructor() {
        _registerStandard(PluginFactoryIDs.PLUGIN_FACTORY_INTERFACE_ID);
    }

    function deploy(address dao, bytes calldata params)
        external
        virtual
        returns (address packageAddress);
}
