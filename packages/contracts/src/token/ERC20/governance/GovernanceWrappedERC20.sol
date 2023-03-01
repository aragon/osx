// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20WrapperUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20WrapperUpgradeable.sol";
import {IVotesUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/utils/IVotesUpgradeable.sol";
import {IERC20PermitUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {ERC20VotesUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import {DaoAuthorizableUpgradeable} from "../../../core/plugin/dao-authorizable/DaoAuthorizableUpgradeable.sol";
import {IDAO} from "../../../core/dao/IDAO.sol";
import {IGovernanceWrappedERC20} from "./IGovernanceWrappedERC20.sol";

/// @title GovernanceWrappedERC20
/// @author Aragon Association
/// @notice Wraps an existing [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token by inheriting from `ERC20WrapperUpgradeable` and allows to use it for voting by inheriting from `ERC20VotesUpgradeable`. The latter is compatible with [OpenZepplin `Votes`](https://docs.openzeppelin.com/contracts/4.x/api/governance#Votes) interface.
/// The contract also supports meta transactions. To use an `amount` of underlying tokens for voting, the token owner has to
/// 1. call `approve` for the tokens to be used by this contract
/// 2. call `depositFor` to wrap them, which safely transfers the underlying [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens to the contract and mints wrapped [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens.
/// To get the [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens back, the owner of the wrapped tokens can call `withdrawFor`, which  burns the wrapped tokens [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens and safely transfers the underlying tokens back to the owner.
/// @dev This contract intentionally has no public mint functionality because this is the responsibility of the underlying [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token contract.
contract GovernanceWrappedERC20 is
    IGovernanceWrappedERC20,
    Initializable,
    ERC165Upgradeable,
    ERC20VotesUpgradeable,
    ERC20WrapperUpgradeable
{
    /// @notice Calls the initialize function.
    /// @param _token The underlying [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token.
    /// @param _name The name of the wrapped token.
    /// @param _symbol The symbol fo the wrapped token.
    constructor(IERC20Upgradeable _token, string memory _name, string memory _symbol) {
        initialize(_token, _name, _symbol);
    }

    /// @notice Initializes the contract.
    /// @param _token The underlying [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token.
    /// @param _name The name of the wrapped token.
    /// @param _symbol The symbol fo the wrapped token.
    function initialize(
        IERC20Upgradeable _token,
        string memory _name,
        string memory _symbol
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Permit_init(_name);
        __ERC20Wrapper_init(_token);
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interface.
    /// @return Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == type(IGovernanceWrappedERC20).interfaceId ||
            _interfaceId == type(IERC20Upgradeable).interfaceId ||
            _interfaceId == type(IERC20PermitUpgradeable).interfaceId ||
            _interfaceId == type(IERC20MetadataUpgradeable).interfaceId ||
            _interfaceId == type(IVotesUpgradeable).interfaceId ||
            super.supportsInterface(_interfaceId);
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

    /// @inheritdoc IGovernanceWrappedERC20
    function depositFor(
        address account,
        uint256 amount
    ) public override(IGovernanceWrappedERC20, ERC20WrapperUpgradeable) returns (bool) {
        return ERC20WrapperUpgradeable.depositFor(account, amount);
    }

    /// @inheritdoc IGovernanceWrappedERC20
    function withdrawTo(
        address account,
        uint256 amount
    ) public override(IGovernanceWrappedERC20, ERC20WrapperUpgradeable) returns (bool) {
        return ERC20WrapperUpgradeable.withdrawTo(account, amount);
    }

    // https://forum.openzeppelin.com/t/self-delegation-in-erc20votes/17501/12?u=novaknole
    /// @inheritdoc ERC20VotesUpgradeable
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20VotesUpgradeable, ERC20Upgradeable) {
        super._afterTokenTransfer(from, to, amount);

        // Automatically turn on delegation on mint/transfer but only for the first time.
        if (to != address(0) && numCheckpoints(to) == 0 && delegates(to) == address(0)) {
            _delegate(to, to);
        }
    }

    /// @inheritdoc ERC20VotesUpgradeable
    function _mint(
        address to,
        uint256 amount
    ) internal override(ERC20VotesUpgradeable, ERC20Upgradeable) {
        super._mint(to, amount);
    }

    /// @inheritdoc ERC20VotesUpgradeable
    function _burn(
        address account,
        uint256 amount
    ) internal override(ERC20VotesUpgradeable, ERC20Upgradeable) {
        super._burn(account, amount);
    }
}
