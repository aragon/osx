// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20WrapperUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20WrapperUpgradeable.sol";

interface IGovernanceWrappedERC20 {
    /// @notice Initializes the GovernanceWrappedERC20.
    /// @param _token The underlying [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token.
    /// @param _name The name of the wrapped token.
    /// @param _symbol The symbol fo the wrapped token.
    function initialize(
        IERC20Upgradeable _token,
        string memory _name,
        string memory _symbol
    ) external;

    /// @notice Returns the number of decimals used to get its user representation.
    function decimals() external view returns (uint8);
}
