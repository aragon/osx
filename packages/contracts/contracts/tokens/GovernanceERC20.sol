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
import "../permissions/DAOPermissionHandler.sol";
import "../core/IDAO.sol";

contract GovernanceERC20 is Initializable, AdaptiveERC165, DAOPermissionHandler, ERC20VotesUpgradeable {

     /// @notice The role identifier to mint new tokens
    bytes32 public constant TOKEN_MINTER_ROLE = keccak256("TOKEN_MINTER_ROLE");

    function initialize(
        IDAO _dao, 
        string calldata _name, 
        string calldata _symbol
    ) external initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Permit_init(_name);
        __Initialize_DAO_Permission(_dao);

        _registerStandard(type(IERC20Upgradeable).interfaceId);
        _registerStandard(type(IERC20PermitUpgradeable).interfaceId);
        _registerStandard(type(IERC20MetadataUpgradeable).interfaceId);
    }
    

    function mint(address to, uint256 amount) external auth(TOKEN_MINTER_ROLE) {
        _mint(to, amount);
    }

    // TODO: https://forum.openzeppelin.com/t/self-delegation-in-erc20votes/17501/12?u=novaknole
    function delegates(address account) public view virtual override returns (address) {
        return account;
    }

    // The functions below are overrides required by Solidity.
    function _afterTokenTransfer(address from, address to, uint256 amount) internal override {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override{
        super._burn(account, amount);
    }

}
