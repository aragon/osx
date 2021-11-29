/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity ^0.8.0;

interface IACLOracle {
    function willPerform(address where, address who, bytes32 role, bytes calldata data) external returns (bool allowed);
}
