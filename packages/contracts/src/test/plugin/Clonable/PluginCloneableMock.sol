// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {PluginCloneable} from "../../../core/plugin/PluginCloneable.sol";
import {IDAO} from "../../../core/dao/IDAO.sol";

contract PluginCloneableV1Mock is PluginCloneable {
    uint256 public state1;

    function initialize(IDAO _dao) external initializer {
        __PluginCloneable_init(_dao);
        state1 = 1;
    }
}

// Doesn't support IPlugin Interface.
contract PluginCloneableV1MockBad {
    uint256 public state1;

    function initialize(IDAO _dao) external {
        (_dao);
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
