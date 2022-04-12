/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20WrapperUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";

import "../core/erc165/AdaptiveERC165.sol";
import "../core/IDAO.sol";

/**
 * @notice The DAO Wrapped Token in case dao already has a token.
 * @dev IMPORTANT: The following contract must be deployed by the proxy standard ERC-1167 or be deployed just directly.
 * NOTE that in case the contract is deployed natively via constructor, contract will still use ERC20VotesUpgradeable
 * instead of ERC20Votes. This will still work, since constructor anyways calls initialize which calls all the initialize
 * functions on the next contracts on the inheritance chain.  This case might bring a little bit more gas costs
 * due to the `__gap` storage variable that OZ upgradable contracts do, but avoiding this means we should also be
 * having different implementations for GovernanceERC20 in such case for proxy and native one. 
 * At the time of writing this, We are moving forward with the united version.

 * NOTE: If user already has a ERC20 token, it's important to wrap it inside This
 * to make it have ERC20Votes functionality. For the voting contract, it works like this:
 * 1. user first calls approve on his own ERC20 to make `amount` spendable by GovernanceWrappedERC20
 * 2. Then calls `depositFor` for `amount` on GovernanceWrappedERC20
 * After those, Users can now participate in the voting. If user doesn't want to make votes anymore,
 * he can call `withdrawTo` to take his tokens back to his ERC20.

 * IMPORTANT: In this token, no need to have mint functionality, 
 * as it's the wrapped token's responsibility to mint whenever needed

 * Inheritance Chain -> 
 * [
   GovernanceWrappedERC20 => ERC20WrapperUpgradeable => ERC20VotesUpgradeable => ERC20PermitUpgradeable =>
   EIP712Upgradeable => ERC20Upgradeable => Initializable
 * ]
*/

contract GovernanceWrappedERC20 is Initializable, AdaptiveERC165, ERC20VotesUpgradeable, ERC20WrapperUpgradeable {

    constructor(IERC20Upgradeable _token, string memory _name, string memory _symbol) {
        initialize(_token, _name, _symbol);
    }

    /// @notice Initializes the Governance ERC20 Token
    /// @dev This is required for the UUPS upgradability pattern
    /// @param _token The token that will be wrapped.
    /// @param _name The name of the token
    /// @param _symbol The symbol of the token
    function initialize(
        IERC20Upgradeable _token, 
        string memory _name,
        string memory _symbol
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Permit_init(_name);
        __ERC20Wrapper_init(_token);

        _registerStandard(type(IERC20Upgradeable).interfaceId);
        _registerStandard(type(IERC20PermitUpgradeable).interfaceId);
        _registerStandard(type(IERC20MetadataUpgradeable).interfaceId);
    }
    
    // The functions below are overrides required by Solidity.
    // https://forum.openzeppelin.com/t/self-delegation-in-erc20votes/17501/12?u=novaknole
    function _afterTokenTransfer(address from, address to, uint256 amount) internal override(ERC20VotesUpgradeable, ERC20Upgradeable) {
        super._afterTokenTransfer(from, to, amount);
        // reduce _delegate calls only when minting
        if(from == address(0) && to != address(0) && delegates(to) == address(0)) {
            _delegate(to, to);
        }
    }

    function _mint(address to, uint256 amount) internal override(ERC20VotesUpgradeable, ERC20Upgradeable) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20VotesUpgradeable, ERC20Upgradeable){
        super._burn(account, amount);
    }
}
