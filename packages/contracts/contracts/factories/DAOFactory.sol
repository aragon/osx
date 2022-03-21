/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./../votings/ERC20Voting/ERC20Voting.sol";
import "./../votings/whitelist/WhitelistVoting.sol";

import "./../tokens/GovernanceERC20.sol";
import "./../tokens/GovernanceWrappedERC20.sol";
import "./../registry/Registry.sol";
import "./../core/DAO.sol";
import "../utils/Proxy.sol";
import "../tokens/MerkleMinter.sol";
import "./TokenFactory.sol";

/// @title DAOFactory to create a DAO
/// @author Giorgi Lagidze & Samuel Furter - Aragon Association - 2022
/// @notice This contract is used to create a DAO.
contract DAOFactory {
    using Address for address;
    using Clones for address;

    string private constant ERROR_MISMATCH = "FACTORY: MISMATCH";

    address public erc20VotingBase;
    address public whitelistVotingBase;

    address public daoBase;

    Registry public registry;
    TokenFactory public tokenFactory;

    struct DAOConfig {
        string name;
        bytes metadata;
    }

    event DAOCreated(string name, address indexed token, address indexed voting);

    // @dev Stores the registry and token factory address and creates the base contracts required for the factory
    // @param _registry The DAO registry to register the DAO with his name
    // @param _tokenFactory The Token Factory to register tokens
    constructor(Registry _registry, TokenFactory _tokenFactory) {
        registry = _registry;
        tokenFactory = _tokenFactory;

        setupBases();
    }

    /// @notice Creates a new DAO based with his name, token, metadata, and the voting settings.
    /// @param _daoConfig The DAO name and metadata
    /// @param _tokenConfig address, name, symbol of the token. If no addr, totally new token gets created.
    /// @param _mintConfig the addresses and amounts to where to mint tokens.
    /// @param _votingSettings settings for the voting contract.
    /// @return dao DAO address.
    /// @return erc20Voting address
    /// @return whitelistVoting address
    /// @return token The token address(wrapped one or the new one)
    /// @return minter Merkle Minter contract address
    function newDAO(
        DAOConfig calldata _daoConfig,
        TokenFactory.TokenConfig calldata _tokenConfig,
        TokenFactory.MintConfig calldata _mintConfig,
        uint256[3] calldata _votingSettings,
        address[] calldata _whitelistVoters,
        address _gsnForwarder
    )
        external
        returns (
            DAO dao,
            ERC20Voting erc20Voting,
            WhitelistVoting whitelistVoting,
            ERC20VotesUpgradeable token,
            MerkleMinter minter
        )
    {
        require(_mintConfig.receivers.length == _mintConfig.amounts.length, ERROR_MISMATCH);

        // create dao
        dao = DAO(createProxy(daoBase, bytes("")));
        // initialize dao with the ROOT_ROLE as DAOFactory
        dao.initialize(_daoConfig.metadata, address(this), _gsnForwarder);

        // Create token and merkle minter
        dao.grant(address(dao), address(tokenFactory), dao.ROOT_ROLE());
        (token, minter) = tokenFactory.newToken(dao, _tokenConfig, _mintConfig);
        dao.revoke(address(dao), address(tokenFactory), dao.ROOT_ROLE());

        // register dao with its name and token to the registry
        // TODO: shall we add minter as well ?
        registry.register(_daoConfig.name, dao, msg.sender, address(token));
        
        erc20Voting = createERC20Voting(dao, token, _votingSettings);
        
        ACLData.BulkItem[] memory items;

        // only create whitelist voting if at least one whitelister is passed.
        if(_whitelistVoters.length > 0) {
            whitelistVoting = createWhitelistVoting(dao, _whitelistVoters, _votingSettings);

            // Grant dao the necessary permissions for WhitelistVoting
            items = new ACLData.BulkItem[](3);
            items[0] = ACLData.BulkItem(ACLData.BulkOp.Grant, whitelistVoting.MODIFY_WHITELIST(), address(dao));
            items[1] = ACLData.BulkItem(ACLData.BulkOp.Grant, whitelistVoting.MODIFY_CONFIG(), address(dao));
            items[2] = ACLData.BulkItem(ACLData.BulkOp.Grant, whitelistVoting.UPGRADE_ROLE(), address(dao));
            dao.bulk(address(whitelistVoting), items);
        }

        // Grant dao the necessary permissions for ERC20Voting
        items = new ACLData.BulkItem[](2);
        items[0] = ACLData.BulkItem(ACLData.BulkOp.Grant, erc20Voting.UPGRADE_ROLE(), address(dao));
        items[1] = ACLData.BulkItem(ACLData.BulkOp.Grant, erc20Voting.MODIFY_CONFIG(), address(dao));
        dao.bulk(address(erc20Voting), items);

        // set roles on the dao itself.
        items = new ACLData.BulkItem[](7);

        // Grant DAO all the permissions required
        items[0] = ACLData.BulkItem(ACLData.BulkOp.Grant, dao.DAO_CONFIG_ROLE(), address(dao));
        items[1] = ACLData.BulkItem(ACLData.BulkOp.Grant, dao.WITHDRAW_ROLE(), address(dao));
        items[2] = ACLData.BulkItem(ACLData.BulkOp.Grant, dao.UPGRADE_ROLE(), address(dao));
        items[3] = ACLData.BulkItem(ACLData.BulkOp.Grant, dao.ROOT_ROLE(), address(dao));
        items[4] = ACLData.BulkItem(ACLData.BulkOp.Grant, dao.SET_SIGNATURE_VALIDATOR_ROLE(), address(dao));
        // Grant voting execution permission
        items[5] = ACLData.BulkItem(ACLData.BulkOp.Grant, dao.EXEC_ROLE(), address(erc20Voting));
        // Revoke permissions from factory
        items[6] = ACLData.BulkItem(ACLData.BulkOp.Revoke, dao.ROOT_ROLE(), address(this));

        dao.bulk(address(dao), items);

        emit DAOCreated(_daoConfig.name, address(token), address(erc20Voting));
    }

    /// @dev internal helper method to create ERC20Voting
    function createERC20Voting(
        IDAO _dao, 
        ERC20VotesUpgradeable _token, 
        uint256[3] calldata _votingSettings
    ) internal returns (ERC20Voting erc20Voting) {
        erc20Voting = ERC20Voting(
            createProxy(
                erc20VotingBase,
                abi.encodeWithSelector(
                    ERC20Voting.initialize.selector,
                    _dao,
                    _token,
                    address(0),
                    _votingSettings[0],
                    _votingSettings[1],
                    _votingSettings[2]
                )
            )
        );
    }

    /// @dev internal helper method to create Whitelist Voting
    function createWhitelistVoting(
        IDAO _dao, 
        address[] calldata _whitelistVoters, 
        uint256[3] calldata _votingSettings
    ) internal returns (WhitelistVoting whitelistVoting) {
        whitelistVoting = WhitelistVoting(
            createProxy(
                whitelistVotingBase,
                abi.encodeWithSelector(
                    WhitelistVoting.initialize.selector,
                    _dao,
                    _whitelistVoters,
                    address(0),
                    _votingSettings[0],
                    _votingSettings[1],
                    _votingSettings[2]
                )
            )
        );
    }

    // @dev Internal helper method to set up the required base contracts on DAOFactory deployment.
    function setupBases() private {
        erc20VotingBase = address(new ERC20Voting());
        whitelistVotingBase = address(new WhitelistVoting());
        daoBase = address(new DAO());
    }
}
