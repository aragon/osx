// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20WrapperUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20WrapperUpgradeable.sol";

interface IGovernanceWrappedERC20 {
    /// @notice Allow a user to deposit underlying tokens and mint the corresponding number of wrapped tokens.
    /// @param account the user address where the tokens should be minted.
    /// @param amount how much will be minted on the account
    function depositFor(address account, uint256 amount) external returns (bool);

    /// @notice Allow a user to burn a number of wrapped tokens and withdraw the corresponding number of underlying tokens.
    /// @param account the user address where the tokens should be minted.
    /// @param amount how much will be minted on the account
    function withdrawTo(address account, uint256 amount) external returns (bool);
}
