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

// NOTE: If user already has a ERC20 token, it's important to wrap it inside This
// to make it have ERC20Votes functionality. For the voting contract, it works like this:
// 1. user first calls approve on his own ERC20 to make `amount` spendable by GovernanceWrappedERC20
// 2. Then calls `depositFor` for `amount` on GovernanceWrappedERC20
// After those, Users can now participate in the voting. If user doesn't want to make votes anymore,
// he can call `withdrawTo` to take his tokens back to his ERC20.

// IMPORTANT: In this token, no need to have mint functionality, 
// as it's the wrapped token's responsibility to mint whenever needed

// Inheritance Chain -> 
// [
//    GovernanceWrappedERC20 => ERC20WrapperUpgradeable => ERC20VotesUpgradeable => ERC20PermitUpgradeable =>
//    EIP712Upgradeable => ERC20Upgradeable => Initializable
// ]
contract GovernanceWrappedERC20 is Initializable, AdaptiveERC165, ERC20VotesUpgradeable, ERC20WrapperUpgradeable, BaseRelayRecipient {

    /// @dev describes the version and contract for GSN compatibility.
    function versionRecipient() external virtual override view returns (string memory) {
        return "0.0.1+opengsn.recipient.GovernanceWrappedERC20";
    }

    function initialize(
        IERC20Upgradeable _token, 
        string calldata _name,
        string calldata _symbol
    ) external initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Permit_init(_name);
        __ERC20Wrapper_init(_token);

        _registerStandard(type(IERC20Upgradeable).interfaceId);
        _registerStandard(type(IERC20PermitUpgradeable).interfaceId);
        _registerStandard(type(IERC20MetadataUpgradeable).interfaceId);
    }

    /// @dev Since 2 base classes end up having _msgSender(OZ + GSN), 
    /// we have to override it and activate GSN's _msgSender. 
    /// NOTE: In the inheritance chain, Permissions a.k.a RelayRecipient
    /// ends up first and that's what gets called by super._msgSender
    function _msgSender() internal view override(BaseRelayRecipient, ContextUpgradeable) virtual returns (address) {
        return super._msgSender();
    }

    /// @dev Since 2 base classes end up having _msgData(OZ + GSN), 
    /// we have to override it and activate GSN's _msgData. 
    /// NOTE: In the inheritance chain, Permissions a.k.a RelayRecipient
    /// ends up first and that's what gets called by super._msgData
    function _msgData() internal view override(BaseRelayRecipient, ContextUpgradeable) virtual returns (bytes calldata) {
        return super._msgData();
    }
    
    // The functions below are overrides required by Solidity.
    // https://forum.openzeppelin.com/t/self-delegation-in-erc20votes/17501/12?u=novaknole
    function _afterTokenTransfer(address from, address to, uint256 amount) internal override(ERC20VotesUpgradeable, ERC20Upgradeable) {
        super._afterTokenTransfer(from, to, amount);
        // reduce _delegate calls only when minting
        if(from == address(0) && to != address(0)) {
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
