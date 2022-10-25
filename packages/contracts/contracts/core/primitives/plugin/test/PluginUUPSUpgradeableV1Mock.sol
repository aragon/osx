// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginUUPSUpgradeable} from "../../plugin/PluginUUPSUpgradeable.sol";
import {IDAO} from "../../dao/IDAO.sol";

contract PluginUUPSUpgradeableV1Mock is PluginUUPSUpgradeable {
    uint256 public num;
    address public helper;

    function initialize(
        IDAO _dao,
        uint256 _num,
        address _helper
    ) external initializer {
        __PluginUUPSUpgradeable_init(_dao);
        num = _num;
        helper = _helper;
    }

    function execute() external {}
}
