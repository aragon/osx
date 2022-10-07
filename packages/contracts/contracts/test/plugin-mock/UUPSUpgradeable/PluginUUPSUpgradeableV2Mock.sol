// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginUUPSUpgradeable} from "../../../core/plugin/PluginUUPSUpgradeable.sol";

contract PluginUUPSUpgradeableV2Mock is PluginUUPSUpgradeable {
    uint256 public num;
    address public helper;

    // add new variable for update
    string public str;

    function initialize(
        uint256 _num,
        address _helper,
        string memory _str
    ) external initializer {
        num = _num;
        helper = _helper;
        str = _str;
    }

    function initializeV2(string memory _str) external reinitializer(2) {
        str = _str;
    }

    function execute() external {}
}
