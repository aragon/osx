// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginUUPSUpgradeable} from "../../../core/plugin/PluginUUPSUpgradeable.sol";
import {IDAO} from "../../../core/IDAO.sol";

contract PluginUUPSUpgradeableV1Mock is PluginUUPSUpgradeable {
    function initialize(IDAO _dao) external virtual initializer {
        __PluginUUPSUpgradeable_init(_dao);
    }
}

contract PluginUUPSUpgradeableV2Mock is PluginUUPSUpgradeableV1Mock {
    function initialize(IDAO _dao) external virtual override reinitializer(2) {
        __PluginUUPSUpgradeable_init(_dao);
    }

    function initializeV2(string memory _str) external reinitializer(2) {}
}

contract PluginUUPSUpgradeableV3Mock is PluginUUPSUpgradeableV2Mock {
    function initialize(IDAO _dao) external override reinitializer(3) {
        __PluginUUPSUpgradeable_init(_dao);
    }

    function initializeV3(string memory _str) external reinitializer(3) {}
}
