// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {GovernanceERC20} from "../../token/ERC20/governance/GovernanceERC20.sol";
import {IDAO} from "../../core/dao/IDAO.sol";

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
