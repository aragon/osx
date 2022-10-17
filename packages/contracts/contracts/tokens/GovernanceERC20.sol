// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IERC20PermitUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {ERC20VotesUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

import {DaoAuthorizableUpgradeable} from "../core/component/dao-authorizable/DaoAuthorizableUpgradeable.sol";
import {IDAO} from "../core/IDAO.sol";

/// @title GovernanceERC20
/// @author Aragon Association
/// @notice An [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token that can be used for voting and is managed by a DAO.
contract GovernanceERC20 is
    Initializable,
    ERC165Upgradeable,
    ERC20VotesUpgradeable,
    DaoAuthorizableUpgradeable
{
    /// @notice The permission identifier to mint new tokens
    bytes32 public constant MINT_PERMISSION_ID = keccak256("MINT_PERMISSION");
    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 public constant GOVERNANCE_INTERFACE_ID =
        this.mint.selector ^ this.initialize.selector;

    /// @param _dao The managing DAO.
    /// @param _name The name of the wrapped token.
    /// @param _symbol The symbol fo the wrapped token.
    constructor(
        IDAO _dao,
        string memory _name,
        string memory _symbol
    ) {
        initialize(_dao, _name, _symbol);
    }

    /// @notice Initializes the component.
    /// @param _dao The managing DAO.
    /// @param _name The name of the wrapped token.
    /// @param _symbol The symbol fo the wrapped token.
    function initialize(
        IDAO _dao,
        string memory _name,
        string memory _symbol
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Permit_init(_name);
        __DaoAuthorizableUpgradeable_init(_dao);
    }

    /// @inheritdoc ERC165Upgradeable
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == GOVERNANCE_INTERFACE_ID ||
            interfaceId == type(IERC20Upgradeable).interfaceId ||
            interfaceId == type(IERC20PermitUpgradeable).interfaceId ||
            interfaceId == type(IERC20MetadataUpgradeable).interfaceId ||
            interfaceId == type(ERC20VotesUpgradeable).interfaceId ||
            super.supportsInterface(interfaceId);
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
