// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../tokens/GovernanceERC20.sol";

import {IDAO} from "../core/IDAO.sol";

contract GovernanceERC20Mock is GovernanceERC20 {
    constructor(
        IDAO _dao,
        string memory _name,
        string memory _symbol,
        MintSettings memory _mintSettings
    )
        GovernanceERC20(
            _dao,
            _name,
            _symbol,
            _mintSettings //MintSettings({amounts: new uint256[](0), receivers: new address[](0)})
        )
    {}

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
