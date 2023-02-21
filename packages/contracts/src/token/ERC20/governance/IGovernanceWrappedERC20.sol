// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20WrapperUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20WrapperUpgradeable.sol";

interface IGovernanceWrappedERC20 {
    /// @notice Deposits an amount of underlying token and mints the corresponding number of wrapped tokens for an receiving address.
    /// @param account The address receiving the minted, wrapped tokens.
    /// @param amount The amount of tokens to be  minted.
    function depositFor(address account, uint256 amount) external returns (bool);

    /// @notice Withdraws an amount of underlying tokens to an receiving address and burns the corresponding number of wrapped tokens.
    /// @param account The address receiving the withdrawn, underlying tokens.
    /// @param amount The amount of underlying tokens to be withdrawn.
    function withdrawTo(address account, uint256 amount) external returns (bool);
}
