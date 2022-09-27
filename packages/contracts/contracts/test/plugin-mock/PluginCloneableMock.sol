// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginCloneable} from "../../core/plugin/PluginCloneable.sol";
import {IDAO} from "../../core/IDAO.sol";

contract PluginClonesV1Mock is PluginCloneable {
    uint256 public num;
    address public helper;

    function initialize(
        IDAO _dao,
        uint256 _num,
        address _helper
    ) external initializer {
        __PluginCloneable_init(_dao);
        num = _num;
        helper = _helper;
    }

    function execute() external {}
}
