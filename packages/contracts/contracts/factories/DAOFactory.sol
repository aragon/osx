/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./../votings/simple/SimpleVoting.sol";
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

    address public votingBase;
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
    constructor(
        Registry _registry,
        TokenFactory _tokenFactory
    ) {
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
    /// @return voting The SimpleVoting address
    /// @return token The token address(wrapped one or the new one)
    /// @return minter Merkle Minter contract address
    function newDAO(
        DAOConfig calldata _daoConfig,
        TokenFactory.TokenConfig calldata _tokenConfig,
        TokenFactory.MintConfig calldata _mintConfig,
        uint256[3] calldata _votingSettings
    ) external returns (
        DAO dao, 
        SimpleVoting voting, 
        ERC20VotesUpgradeable token,
        MerkleMinter minter
    ) {
        require(_mintConfig.receivers.length == _mintConfig.amounts.length, ERROR_MISMATCH);
        
        // create dao
        dao = DAO(createProxy(daoBase, bytes("")));
        // initialize dao with the ROOT_ROLE as DAOFactory
        dao.initialize(_daoConfig.metadata, address(this));  

        // Create token and merkle minter
        dao.grant(address(dao), address(tokenFactory), dao.ROOT_ROLE());
        (token, minter) = tokenFactory.newToken(
            dao,
            _tokenConfig,
            _mintConfig
        );
        dao.revoke(address(dao), address(tokenFactory), dao.ROOT_ROLE());

        // register dao with its name and token to the registry
        // TODO: shall we add minter as well ? 
        registry.register(_daoConfig.name, dao, msg.sender, address(token));
        
        // create voting and initialize right away.
        voting = SimpleVoting(
            createProxy(
                votingBase,
                abi.encodeWithSelector(
                    SimpleVoting.initialize.selector,
                    dao,
                    token,
                    _votingSettings[0],
                    _votingSettings[1],
                    _votingSettings[2]
                )
            )
        );

        // Grant dao permission to change voting settings.
        dao.grant(address(voting), address(dao), voting.MODIFY_CONFIG());

        ACLData.BulkItem[] memory items = new ACLData.BulkItem[](7);

        // set roles on the dao itself.
        items = new ACLData.BulkItem[](7);

        // Grant DAO all the permissions required
        items[0] = ACLData.BulkItem(ACLData.BulkOp.Grant, dao.DAO_CONFIG_ROLE(), address(dao));
        items[1] = ACLData.BulkItem(ACLData.BulkOp.Grant, dao.WITHDRAW_ROLE(), address(dao));
        items[2] = ACLData.BulkItem(ACLData.BulkOp.Grant, dao.UPGRADE_ROLE(), address(dao));
        items[3] = ACLData.BulkItem(ACLData.BulkOp.Grant, dao.ROOT_ROLE(), address(dao));
        items[4] = ACLData.BulkItem(ACLData.BulkOp.Grant, dao.SET_SIGNATURE_VALIDATOR_ROLE(), address(dao));
        // Grant voting execution permission
        items[5] = ACLData.BulkItem(ACLData.BulkOp.Grant, dao.EXEC_ROLE(), address(voting));
        // Revoke permissions from factory
        items[6] = ACLData.BulkItem(ACLData.BulkOp.Revoke, dao.ROOT_ROLE(), address(this));

        dao.bulk(address(dao), items);
    
        emit DAOCreated(_daoConfig.name, address(token), address(voting));
    }

    // @dev Internal helper method to set up the required base contracts on DAOFactory deployment.
    function setupBases() private {
        votingBase = address(new SimpleVoting());
        daoBase = address(new DAO());
    }
}
