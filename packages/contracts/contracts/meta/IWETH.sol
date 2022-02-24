/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// WETH   https://etherscan.io/address/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
// WMATIC https://polygonscan.com/address/0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270#code

interface IWETH is IERC20 {
    event Deposit(address indexed sender, uint256 amount);
    event Withdrawal(address indexed recipient, uint256 amount);

    function deposit() external payable;
    function withdraw(uint256 amount) external;
}