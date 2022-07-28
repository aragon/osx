// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../core/component/DaoAuthorizable.sol";
import "../core/erc165/AdaptiveERC165.sol";
import "../core/IDAO.sol";

/// @title GovernanceERC20
/// @author Aragon Association
/// @notice An [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token that can be used for voting and is managed by a DAO.
contract GovernanceERC20 is AdaptiveERC165, ERC20VotesUpgradeable, DaoAuthorizable {
    /// @notice The permission identifier to mint new tokens
    bytes32 public constant MINT_PERMISSION_ID = keccak256("MINT_PERMISSION");

    /// @notice Internal initialization method.
    /// @param _dao The managing DAO.
    /// @param _name The name of the wrapped token.
    /// @param _symbol The symbol fo the wrapped token.
    function __GovernanceERC20_init(
        IDAO _dao,
        string calldata _name,
        string calldata _symbol
    ) internal onlyInitializing {
        __ERC20_init(_name, _symbol);
        __ERC20Permit_init(_name);
        __DaoAuthorizable_init(_dao);

        _registerStandard(type(IERC20Upgradeable).interfaceId);
        _registerStandard(type(IERC20PermitUpgradeable).interfaceId);
        _registerStandard(type(IERC20MetadataUpgradeable).interfaceId);
    }

    /// @notice Initializes the component.
    /// @param _dao The managing DAO.
    /// @param _name The name of the wrapped token.
    /// @param _symbol The symbol fo the wrapped token.
    function initialize(
        IDAO _dao,
        string calldata _name,
        string calldata _symbol
    ) external initializer {
        __GovernanceERC20_init(_dao, _name, _symbol);
    }

    /// @notice Mints tokens to an address.
    /// @param to The address receiving the tokens.
    /// @param amount The amount of tokens to be minted.
    function mint(address to, uint256 amount) external auth(MINT_PERMISSION_ID) {
        _mint(to, amount);
    }

    // The functions below are overrides required by Solidity.
    // https://forum.openzeppelin.com/t/self-delegation-in-erc20votes/17501/12?u=novaknole
    /// @inheritdoc ERC20VotesUpgradeable
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._afterTokenTransfer(from, to, amount);
        // reduce _delegate calls only when minting
        if (from == address(0) && to != address(0) && delegates(to) == address(0)) {
            _delegate(to, to);
        }
    }

    /// @inheritdoc ERC20VotesUpgradeable
    function _mint(address to, uint256 amount) internal override {
        super._mint(to, amount);
    }

    /// @inheritdoc ERC20VotesUpgradeable
    function _burn(address account, uint256 amount) internal override {
        super._burn(account, amount);
    }
}
