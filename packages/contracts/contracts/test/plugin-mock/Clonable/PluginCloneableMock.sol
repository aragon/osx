// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginCloneable} from "../../../core/plugin/PluginCloneable.sol";
import {IDAO} from "../../../core/IDAO.sol";

contract PluginCloneableV1Mock is PluginCloneable {
    uint256 public v1;

    function initialize(IDAO _dao) external virtual initializer {
        __PluginCloneable_init(_dao);
        v1 = 1;
    }
}

contract PluginCloneableV2Mock is PluginCloneableV1Mock {
    uint256 public v2;

    function initialize(IDAO _dao) external virtual override initializer {
        __PluginCloneable_init(_dao);
        v1 = 1;
        v2 = 2;
    }
}
