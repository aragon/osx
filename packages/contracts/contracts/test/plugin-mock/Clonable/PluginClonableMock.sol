// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginCloneable} from "../../../core/plugin/PluginCloneable.sol";
import {IDAO} from "../../../core/IDAO.sol";

contract PluginClonableMock is PluginCloneable {
    uint256 public num;
    address public helper;

    // add new variable for update
    string public str;

    function initialize(
        IDAO _dao,
        uint256 _num,
        address _helper,
        string memory _str
    ) external initializer {
        __PluginCloneable_init(_dao);
    }
}
