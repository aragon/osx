/*
 * SPDX-License-Identifier:    GPL-3.0
 */

pragma solidity 0.8.10;

// Useful contract to test if dao can successfully call the action.

contract ActionExecute {

    bool public test;

    function setTest() public {
        test = true;
    }

}
