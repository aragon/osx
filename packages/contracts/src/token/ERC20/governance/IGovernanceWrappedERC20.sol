// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20WrapperUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20WrapperUpgradeable.sol";

/// @title IGovernanceWrappedERC20
/// @author Aragon Association
/// @notice An interface for the token wrapping contract wrapping existing [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens.
/// @custom:security-contact sirt@aragon.org
interface IGovernanceWrappedERC20 {
    /// @notice Deposits an amount of underlying token and mints the corresponding number of wrapped tokens for a receiving address.
    /// @param account The address receiving the minted, wrapped tokens.
    /// @param amount The amount of tokens to deposit.
    function depositFor(address account, uint256 amount) external returns (bool);

    /// @notice Withdraws an amount of underlying tokens to a receiving address and burns the corresponding number of wrapped tokens.
    /// @param account The address receiving the withdrawn, underlying tokens.
    /// @param amount The amount of underlying tokens to withdraw.
    function withdrawTo(address account, uint256 amount) external returns (bool);
}
