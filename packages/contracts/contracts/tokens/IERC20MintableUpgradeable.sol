// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

/// @title IERC20MintableUpgradeable
/// @notice Interface to allow minting of [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens.
interface IERC20MintableUpgradeable {
    /// @notice Mints [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens for a receiving address.
    /// @param _to The receiving address.
    /// @param _amount The amount of tokens.
    function mint(address _to, uint256 _amount) external;
}
