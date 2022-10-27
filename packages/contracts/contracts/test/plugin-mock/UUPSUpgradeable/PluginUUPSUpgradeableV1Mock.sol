// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginUUPSUpgradeable} from "../../../core/plugin/PluginUUPSUpgradeable.sol";
import {IDAO} from "../../../core/IDAO.sol";

contract PluginUUPSUpgradeableV1Mock is PluginUUPSUpgradeable {
    uint256 public v1;

    function initialize(IDAO _dao) external virtual initializer {
        __PluginUUPSUpgradeable_init(_dao);
        v1 = 1;
    }
}

contract PluginUUPSUpgradeableV2Mock is PluginUUPSUpgradeableV1Mock {
    uint256 public v2;

    function initialize(IDAO _dao) external virtual override reinitializer(2) {
        __PluginUUPSUpgradeable_init(_dao);
        v1 = 1;
        v2 = 2;
    }

    function initializeV2() external reinitializer(2) {
        v2 = v2;
    }
}

contract PluginUUPSUpgradeableV3Mock is PluginUUPSUpgradeableV2Mock {
    uint256 public v3;

    function initialize(IDAO _dao) external override reinitializer(3) {
        __PluginUUPSUpgradeable_init(_dao);
        v1 = 1;
        v2 = 2;
        v3 = 3;
    }

    function initializeV3() external reinitializer(3) {
        v3 = 3;
    }
}
