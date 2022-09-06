// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginUUPSUpgradeable} from "../core/plugin/PluginUUPSUpgradeable.sol";

contract PluginUUPSUpgradableMock is PluginUUPSUpgradeable {
    function execute() public {}
}
