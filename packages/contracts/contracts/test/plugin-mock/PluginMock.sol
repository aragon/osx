// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Plugin} from "../../core/plugin/Plugin.sol";
import {IDAO} from "../../core/IDAO.sol";

contract PluginMock is Plugin {
    uint256 public num;
    address public helper;

    constructor(
        IDAO _dao,
        uint256 _num,
        address _helper
    ) Plugin(_dao) {
        num = _num;
        helper = _helper;
    }

    function execute() external {}
}
