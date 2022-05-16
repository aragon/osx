// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/// @notice Interface to allow minting of ERC20 tokens.
interface IERC20MintableUpgradeable is IERC20Upgradeable {
    /// @notice Mints ERC20 tokens for an receiving address.
    /// @param _to receiving address
    /// @param _amount amount of tokens
    function mint(address _to, uint256 _amount) external;
}
