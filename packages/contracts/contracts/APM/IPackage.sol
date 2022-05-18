/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

interface IPackage {
    function deploy(address dao, bytes calldata params) external returns (address appAddress);
}
