// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginCloneable} from "../../../core/plugin/PluginCloneable.sol";
import {IDAO} from "../../../core/IDAO.sol";

contract PluginCloneableV1Mock is PluginCloneable {
    uint256 public state1;

    function initialize(IDAO _dao) external initializer {
        __PluginCloneable_init(_dao);
        state1 = 1;
    }
}

contract PluginCloneableV2Mock is PluginCloneable {
    uint256 public state1;
    uint256 public state2;

    function initialize(IDAO _dao) external initializer {
        __PluginCloneable_init(_dao);
        state1 = 1;
        state2 = 2;
    }
}
