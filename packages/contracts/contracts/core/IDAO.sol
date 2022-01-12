/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity ^0.8.0;

interface IDAO {
    // ACL handling permission
    function hasPermission(address _where, address _who, bytes32 _role, bytes memory data) external returns(bool);
}
