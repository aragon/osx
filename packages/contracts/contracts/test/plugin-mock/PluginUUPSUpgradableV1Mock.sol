// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginUUPSUpgradeable} from "../../core/plugin/PluginUUPSUpgradeable.sol";

contract PluginUUPSUpgradableV1Mock is PluginUUPSUpgradeable {
    uint256 public num;
    address public helper;

    function initialize(uint256 _num, address _helper) external initializer {
        num = _num;
        helper = _helper;
    }

    function execute() public {}
}
