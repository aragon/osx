// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20WrapperUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";

import "../core/erc165/AdaptiveERC165.sol";
import "../core/IDAO.sol";

/// @title GovernanceWrappedERC20
/// @author Aragon Association
/// @notice Wraps an existing [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token by inheriting from `ERC20WrapperUpgradeable` and allows to use it for voting by inheriting from `ERC20VotesUpgradeable`.
/// The contract also supports meta transactions. To use an `amount` of underlying tokens for voting, the token owner has to
/// 1. call `approve` for the tokens to be used by this contract
/// 2. call `depositFor` to wrap them, which safely transfers the underlying [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens to the contract and mints wrapped [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens.
/// To get the [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens back, the owner of the wrapped tokens can call `withdrawFor`, which  burns the wrapped tokens [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens and safely transfers the underlying tokens back to the owner.
/// @dev This contract intentionally has no public mint functionality because this is the responsibility of the underlying [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token contract.
contract GovernanceWrappedERC20 is
    Initializable,
    AdaptiveERC165,
    ERC20VotesUpgradeable,
    ERC20WrapperUpgradeable,
    BaseRelayRecipient
    // Inheritance Chain: GovernanceWrappedERC20 => ERC20WrapperUpgradeable => ERC20VotesUpgradeable => ERC20PermitUpgradeable => EIP712Upgradeable => ERC20Upgradeable => Initializable => BaseRelayRecipient
{
    /// @notice Returns the version of the GSN relay recipient
    /// @dev Describes the version and contract for GSN compatibility
    function versionRecipient() external view virtual override returns (string memory) {
        return "0.0.1+opengsn.recipient.GovernanceWrappedERC20";
    }

    /// @notice Internal initialization method.
    /// @param _token The underlying [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token.
    /// @param _name The name of the wrapped token.
    /// @param _symbol The symbol fo the wrapped token.
    function __GovernanceWrappedERC20_init(
        IERC20Upgradeable _token,
        string calldata _name,
        string calldata _symbol
    ) internal onlyInitializing {
        __ERC20_init(_name, _symbol);
        __ERC20Permit_init(_name);
        __ERC20Wrapper_init(_token);

        _registerStandard(type(IERC20Upgradeable).interfaceId);
        _registerStandard(type(IERC20PermitUpgradeable).interfaceId);
        _registerStandard(type(IERC20MetadataUpgradeable).interfaceId);
    }

    /// @notice Initializes the component.
    /// @param _token The underlying [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token.
    /// @param _name The name of the wrapped token.
    /// @param _symbol The symbol fo the wrapped token.
    function initialize(
        IERC20Upgradeable _token,
        string calldata _name,
        string calldata _symbol
    ) external initializer {
        __GovernanceWrappedERC20_init(_token, _name, _symbol);
    }

    /// @inheritdoc ERC20WrapperUpgradeable
    /// @dev Uses the `decimals` of the underlying [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token.
    function decimals()
        public
        view
        override(ERC20Upgradeable, ERC20WrapperUpgradeable)
        returns (uint8)
    {
        return ERC20WrapperUpgradeable.decimals();
    }

    /// @notice Uses the `BaseRelayRecipient` `_msgSender()` context.
    /// @dev `BaseRelayRecipient` is the first contract in the inheritance chain and is thus called by `super._msgSender()`.
    function _msgSender()
        internal
        view
        virtual
        override(BaseRelayRecipient, ContextUpgradeable)
        returns (address)
    {
        return super._msgSender();
    }

    /// @notice Uses the `BaseRelayRecipient` `_msgData()` context.
    /// @dev `BaseRelayRecipient` is the first contract in the inheritance chain and is thus called by `super._msgData()`.
    function _msgData()
        internal
        view
        virtual
        override(BaseRelayRecipient, ContextUpgradeable)
        returns (bytes calldata)
    {
        return super._msgData();
    }

    // The functions below are overrides required by Solidity.
    // https://forum.openzeppelin.com/t/self-delegation-in-erc20votes/17501/12?u=novaknole

    /// @inheritdoc ERC20Upgradeable
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20VotesUpgradeable, ERC20Upgradeable) {
        super._afterTokenTransfer(from, to, amount);
        // reduce _delegate calls only when minting
        if (from == address(0) && to != address(0) && delegates(to) == address(0)) {
            _delegate(to, to);
        }
    }

    /// @inheritdoc ERC20Upgradeable
    function _mint(address to, uint256 amount)
        internal
        override(ERC20VotesUpgradeable, ERC20Upgradeable)
    {
        super._mint(to, amount);
    }

    /// @inheritdoc ERC20Upgradeable
    function _burn(address account, uint256 amount)
        internal
        override(ERC20VotesUpgradeable, ERC20Upgradeable)
    {
        super._burn(account, amount);
    }
}
