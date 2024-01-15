// SPDX-License-Identifier: AGPL-3.0-or-later

/* solhint-disable one-contract-per-file */
pragma solidity ^0.8.8;

import {PluginCloneable} from "@aragon/osx-commons-contracts/src/plugin/PluginCloneable.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

contract PluginCloneableV1Mock is PluginCloneable {
    uint256 public state1;

    function initialize(IDAO _dao) external initializer {
        __PluginCloneable_init(_dao);
        state1 = 1;
    }
}

// Doesn't support IPlugin Interface. // TODO revisit tests
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
