// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginUUPSUpgradeable} from "../core/plugin/PluginUUPSUpgradeable.sol";

contract PluginUUPSUpgradableV1Mock is PluginUUPSUpgradeable {
    uint256 public num;

    function initialize(uint256 _num) external initializer {
        num = _num;
    }

    function execute() public {}
}

contract PluginUUPSUpgradableV2Mock is PluginUUPSUpgradeable {
    uint256 public num;

    // add new variable for update
    string public str;

    function initialize(uint256 _num, string memory _str) external initializer {
        num = _num;
        str = _str;
    }

    function initializeV2(string memory _str) external reinitializer(2) {
        str = _str;
    }

    function execute() public {}
}
