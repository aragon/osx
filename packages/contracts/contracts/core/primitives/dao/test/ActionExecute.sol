// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.10;

/// @notice A dummy contract to test if DAO can successfully execute an action
contract ActionExecute {
    bool public test;

    function setTest() public {
        test = true;
    }
}
