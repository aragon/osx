/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

interface IPluginFactory {
    function deploy(address dao, bytes calldata params) external returns (address packageAddress);
}
