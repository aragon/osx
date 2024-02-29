// SPDX-License-Identifier: AGPL-3.0-or-later

/* solhint-disable one-contract-per-file */
pragma solidity ^0.8.8;

import {PluginUUPSUpgradeable} from "@aragon/osx-commons-contracts/src/plugin/PluginUUPSUpgradeable.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

/// @notice A mock upgradeable plugin to be deployed via the UUPS proxy pattern.
/// v1.1 (Release 1, Build 1)
/// @dev DO NOT USE IN PRODUCTION!
contract PluginUUPSUpgradeableMockBuild1 is PluginUUPSUpgradeable {
    uint256 public state1;

    function initialize(IDAO _dao) external initializer {
        __PluginUUPSUpgradeable_init(_dao);
        state1 = 1;
    }
}

/// @notice A mock upgradeable plugin to be deployed via the UUPS proxy pattern.
/// v1.1 (Release 1, Build 2)
/// @dev DO NOT USE IN PRODUCTION!
contract PluginUUPSUpgradeableMockBuild2 is PluginUUPSUpgradeable {
    uint256 public state1;
    uint256 public state2;

    function initialize(IDAO _dao) external reinitializer(2) {
        __PluginUUPSUpgradeable_init(_dao);
        state1 = 1;
        state2 = 2;
    }

    function initializeFrom(uint16 _previousBuild) external reinitializer(2) {
        if (_previousBuild < 2) {
            state2 = 2;
        }
    }
}

/// @notice A mock upgradeable plugin to be deployed via the UUPS proxy pattern.
/// v1.1 (Release 1, Build 3)
/// @dev DO NOT USE IN PRODUCTION!
contract PluginUUPSUpgradeableMockBuild3 is PluginUUPSUpgradeable {
    uint256 public state1;
    uint256 public state2;
    uint256 public state3;

    function initialize(IDAO _dao) external reinitializer(3) {
        __PluginUUPSUpgradeable_init(_dao);
        state1 = 1;
        state2 = 2;
        state3 = 3;
    }

    function initializeFrom(uint16 _previousBuild) external reinitializer(3) {
        if (_previousBuild < 2) {
            state2 = 2;
        }
        if (_previousBuild < 3) {
            state3 = 3;
        }
    }
}

/// @notice A mock upgradeable plugin missing an initializer function.
/// @dev DO NOT USE IN PRODUCTION!
contract PluginUUPSUpgradeableMockBad is PluginUUPSUpgradeable {
    uint256 public state1;

    function notAnInitializer(IDAO _dao) external {
        __PluginUUPSUpgradeable_init(_dao);
        state1 = 1;
    }
}
