// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

/// @notice A dummy contract to test if DAO can successfully execute an action
contract ActionExecute {
    uint num = 10;

    function setTest(uint newNum) public returns (uint) {
        num = newNum;
        return num;
    }

    function fail() public pure {
        revert("ActionExecute:Revert");
    }
}
