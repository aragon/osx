// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {PluginUUPSUpgradeable} from "../../../core/plugin/PluginUUPSUpgradeable.sol";
import {IDAO} from "../../../core/dao/IDAO.sol";

contract PluginUUPSUpgradeableV1Mock is PluginUUPSUpgradeable {
    uint256 public state1;

    function initialize(IDAO _dao) external initializer {
        __PluginUUPSUpgradeable_init(_dao);
        state1 = 1;
    }
}

contract PluginUUPSUpgradeableV2Mock is PluginUUPSUpgradeable {
    uint256 public state1;
    uint256 public state2;

    function initialize(IDAO _dao) external reinitializer(2) {
        __PluginUUPSUpgradeable_init(_dao);
        state1 = 1;
        state2 = 2;
    }

    function initializeV1toV2() external reinitializer(2) {
        state2 = 2;
    }
}

contract PluginUUPSUpgradeableV3Mock is PluginUUPSUpgradeable {
    uint256 public state1;
    uint256 public state2;
    uint256 public state3;

    function initialize(IDAO _dao) external reinitializer(3) {
        __PluginUUPSUpgradeable_init(_dao);
        state1 = 1;
        state2 = 2;
        state3 = 3;
    }

    function initializeV1toV3() external reinitializer(3) {
        state2 = 2;
        state3 = 3;
    }

    function initializeV2toV3() external reinitializer(3) {
        state3 = 3;
    }
}
