/*
 * SPDX-License-Identifier:    MIT
 */

/*
    DIRTY CONTRACT - should not be used in production, this is for POC purpose only
*/

pragma solidity 0.8.10;

interface IApp {
    function deploy(address dao, bytes calldata params) external returns (address appAddress);
}
