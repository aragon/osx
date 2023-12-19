// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {IDAO} from "@aragon/osx-commons/src/interfaces/IDAO.sol";

import {GovernanceERC20} from "../../token/ERC20/governance/GovernanceERC20.sol";

/// @title TestGovernanceERC20
/// @author Aragon Association - 2022-2023
/// @notice A test GovernanceERC20 that can be minted and burned by everyone.
/// @dev DO NOT USE IN PRODUCTION!
contract TestGovernanceERC20 is GovernanceERC20 {
    constructor(
        IDAO _dao,
        string memory _name,
        string memory _symbol,
        MintSettings memory _mintSettings
    ) GovernanceERC20(_dao, _name, _symbol, _mintSettings) {}

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
