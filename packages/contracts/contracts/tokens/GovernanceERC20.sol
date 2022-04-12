/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "../core/erc165/AdaptiveERC165.sol";
import "../core/component/Permissions.sol";
import "../core/IDAO.sol";


/**
 * @notice The DAO Token
 * @dev IMPORTANT: The following contract must be deployed by the proxy standard ERC-1167 or be deployed just directly.
 * NOTE that in case the contract is deployed natively via constructor, contract will still use ERC20VotesUpgradeable
 * instead of ERC20Votes. This will still work, since constructor anyways calls initialize which calls all the initialize
 * functions on the next contracts on the inheritance chain.  This case might bring a little bit more gas costs
 * due to the `__gap` storage variable that OZ upgradable contracts do, but avoiding this means we should also be
 * having different implementations for GovernanceERC20 in such case for proxy and native one. 
 * At the time of writing this, We are moving forward with the united version.
 */

/// @title Governance Token for the DAO
/// @author Giorgi Lagidze - 2021
contract GovernanceERC20 is AdaptiveERC165, ERC20VotesUpgradeable, Permissions {
    /// @notice The role identifier to mint new tokens
    bytes32 public constant TOKEN_MINTER_ROLE = keccak256("TOKEN_MINTER_ROLE");
    
    constructor(IDAO _dao, string memory _name, string memory _symbol) {
        initialize(_dao, _name, _symbol);
    }

    /// @notice Initializes the Governance ERC20 Token
    /// @dev This is required for the UUPS upgradability pattern
    /// @param _dao The IDAO interface of the associated DAO
    /// @param _name The name of the token
    /// @param _symbol The symbol of the token
    function initialize(
        IDAO _dao, 
        string memory _name, 
        string memory _symbol
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Permit_init(_name);
        __Permissions_init(_dao);

        _registerStandard(type(IERC20Upgradeable).interfaceId);
        _registerStandard(type(IERC20PermitUpgradeable).interfaceId);
        _registerStandard(type(IERC20MetadataUpgradeable).interfaceId);
    }

    function mint(address to, uint256 amount) external auth(TOKEN_MINTER_ROLE) {
        _mint(to, amount);
    }

    // The functions below are overrides required by Solidity.
    // https://forum.openzeppelin.com/t/self-delegation-in-erc20votes/17501/12?u=novaknole
    function _afterTokenTransfer(address from, address to, uint256 amount) internal override {
        super._afterTokenTransfer(from, to, amount);
        // reduce _delegate calls only when minting
        if(from == address(0) && to != address(0) && delegates(to) == address(0)) {
            _delegate(to, to);
        }
    }

    function _mint(address to, uint256 amount) internal override {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override{
        super._burn(account, amount);
    }

}
