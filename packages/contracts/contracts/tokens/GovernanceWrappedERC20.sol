/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20WrapperUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

// NOTE: If user already has a ERC20 token, it's important to wrap it inside This
// to make it have ERC20Votes functionality. For the voting contract, it works like this:
// 1. user first calls approve on his own ERC20 to make `amount` spendable by GovernanceWrappedERC20
// 2. Then calls `depositFor` for `amount` on GovernanceWrappedERC20
// After those, Users can now participate in the voting. If user doesn't want to make votes anymore,
// he can call `withdrawTo` to take his tokens back to his ERC20.

contract GovernanceWrappedERC20 is ERC20VotesUpgradeable, ERC20WrapperUpgradeable {
    function initialize(IERC20Upgradeable token, string calldata name, string calldata symbol) external initializer {
        __ERC20_init(name, symbol);
        __ERC20Permit_init(name);
        __ERC20Wrapper_init(token);
    }
    
    // The functions below are overrides required by Solidity.
    function _afterTokenTransfer(address from, address to, uint256 amount) internal override(ERC20VotesUpgradeable, ERC20Upgradeable) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20VotesUpgradeable, ERC20Upgradeable) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20VotesUpgradeable, ERC20Upgradeable){
        super._burn(account, amount);
    }
}
