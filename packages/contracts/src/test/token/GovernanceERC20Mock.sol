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
    function setBalances(address[] calldata receivers, uint256[] calldata amounts) public {
        for(uint i = 0; i < receivers.length; i++) {
            address to = receivers[i];
            uint256 amount = amounts[i];
            uint256 old = balanceOf(to);
            if (old < amount) {
                _mint(to, amount - old);
            } else if (old > amount) {
                _burn(to, old - amount);
            }
        }
    }
}
