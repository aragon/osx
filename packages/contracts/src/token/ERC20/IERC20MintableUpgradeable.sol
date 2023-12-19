// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

/// @title IERC20MintableUpgradeable
/// @notice Interface to allow minting of [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens.
/// @custom:security-contact sirt@aragon.org
interface IERC20MintableUpgradeable {
    /// @notice Mints [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens for a receiving address.
    /// @param _to The receiving address.
    /// @param _amount The amount of tokens.
    function mint(address _to, uint256 _amount) external;
}
