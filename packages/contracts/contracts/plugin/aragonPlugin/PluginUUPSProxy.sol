/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./AppStorage.sol";

contract PluginUUPSProxy is ERC1967Proxy, AppStorage {
    constructor(
        address _dao,
        address _logic,
        bytes memory _data
    ) ERC1967Proxy(_logic, _data) {
        if (_dao != address(0)) {
            setDAO(_dao);
        }
    }
}
