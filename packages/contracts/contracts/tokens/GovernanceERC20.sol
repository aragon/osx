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


contract GovernanceERC20 is AdaptiveERC165, ERC20VotesUpgradeable, Permissions {

     /// @notice The role identifier to mint new tokens
    bytes32 public constant TOKEN_MINTER_ROLE = keccak256("TOKEN_MINTER_ROLE");

    /// @dev describes the version and contract for GSN compatibility.
    function versionRecipient() external virtual override view returns (string memory) {
        return "0.0.1+opengsn.recipient.GovernanceERC20";
    }

    function initialize(
        IDAO _dao, 
        string calldata _name, 
        string calldata _symbol
    ) external initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Permit_init(_name);
        __Permission_init(_dao);

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
