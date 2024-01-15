// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice A mock [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token that can be minted and burned by everyone.
/// @dev DO NOT USE IN PRODUCTION!
contract ERC20Mock is ERC20 {
    uint8 public decimals_ = 18;

    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}

    function setDecimals(uint8 _decimals) public {
        decimals_ = _decimals;
    }

    function decimals() public view override returns (uint8) {
        return decimals_;
    }

    // sets the balance of the address
    // this mints/burns the amount depending on the current balance
    function setBalance(address to, uint256 amount) public {
        uint256 old = balanceOf(to);
        if (old < amount) {
            _mint(to, amount - old);
        } else if (old > amount) {
            _burn(to, old - amount);
        }
    }
}
