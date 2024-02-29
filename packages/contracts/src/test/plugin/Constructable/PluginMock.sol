// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {Plugin} from "@aragon/osx-commons-contracts/src/plugin/Plugin.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

/// @notice A mock plugin to be deployed via the `new` keyword.
/// v1.1 (Release 1, Build 1)
/// @dev DO NOT USE IN PRODUCTION!
contract PluginMockBuild1 is Plugin {
    uint256 public state1;

    constructor(IDAO _dao) Plugin(_dao) {
        state1 = 1;
    }
}
