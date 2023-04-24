// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {
    uint8 public decimals_ = 18;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 amountToMint
    ) ERC20(name_, symbol_) {
        setBalance(msg.sender, amountToMint);
    }

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
