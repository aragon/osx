// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.8;

contract Target {
    uint public val;

    function setValue(uint256 _val) public {
        val = _val;
    }
}
