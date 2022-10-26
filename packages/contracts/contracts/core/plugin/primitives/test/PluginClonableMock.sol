// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginCloneable} from "../PluginCloneable.sol";
import {IDAO} from "../../../dao/primitives/IDAO.sol";

contract PluginCloneableMock is PluginCloneable {
    function initialize(IDAO _dao) external initializer {
        __PluginCloneable_init(_dao);
    }
}
