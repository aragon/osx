// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginUUPSUpgradeable} from "../../../core/plugin/PluginUUPSUpgradeable.sol";
import {IDAO} from "../../../core/IDAO.sol";

contract PluginUUPSUpgradeableV3Mock is PluginUUPSUpgradeable {
    // V1 storage
    uint256 public num;
    address public helper;

    // V2 storage
    string public str;

    // V3 storage
    bool boolVar;

    function initialize(
        IDAO _dao,
        uint256 _num,
        address _helper,
        string memory _str,
        bool _boolVar
    ) external reinitializer(3) {
        __PluginUpgradeable_init(_dao);
        num = _num;
        helper = _helper;
        str = _str;
        boolVar = _boolVar;
    }

    function initializeFromV1(string memory _str, bool _boolVar) external reinitializer(3) {
        str = _str;
        boolVar = _boolVar;
    }

    function initializeFromV2(bool _boolVar) external reinitializer(3) {
        boolVar = _boolVar;
    }
}
