// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IDAO} from "../core/IDAO.sol";

interface IGovernanceERC20 {
    
    /// @notice Initializes the component.
    /// @param _dao The managing DAO.
    /// @param _name The name of the wrapped token.
    /// @param _symbol The symbol fo the wrapped token.
    function initialize(
        IDAO _dao,
        string memory _name,
        string memory _symbol
    ) external;

    /// @notice Mints tokens to an address.
    /// @param to The address receiving the tokens.
    /// @param amount The amount of tokens to be minted.
    function mint(address to, uint256 amount) external;

}