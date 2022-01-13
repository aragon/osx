/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./../processes/votings/simple/SimpleVoting.sol";
import "./../tokens/GovernanceERC20.sol";
import "./../tokens/GovernanceWrappedERC20.sol";
import "./../core/processes/Process.sol";
import "./../registry/Registry.sol";
import "./../core/DAO.sol";

import "../utils/Proxy.sol";

/// @title DAOFactory to create a DAO
/// @author Giorgi Lagidze & Samuel Furter - Aragon Association - 2022
/// @notice This contract is used to create a DAO.
contract DAOFactory {
    using Address for address;
    
    address private votingBase;
    address private daoBase;
    address private governanceERC20Base;
    address private governanceWrappedERC20Base;

    Registry private registry;

    struct TokenConfig {
        address addr;
        string name;
        string symbol;
    }

    // @dev Stores the registry address and creates the base contracts required for the factory
    // @param _registry The DAO registry to register the DAO with his name
    constructor(Registry _registry) {
        registry = _registry;
        setupBases();
    }

    // @notice Creates a new DAO based with his name, token, metadata, and the voting settings.
    // @param name The DAO name as string
    // @param _metadata The IPFS hash pointing to the metadata JSON object of the DAO
    // @param _tokenConfig The address of the token, name, and symbol. If no addr is passed will a new token get created.
    // @return dao The DAO contract created
    // @return voting The voting process for this DAO - Currently a hard-coded process. With the planned marketplace will this be more dynamic.
    // @return token The token passed or created that belongs to this DAO. - Probably not a requirement in the future.
    function newDAO(
        string calldata name,
        bytes calldata _metadata,
        TokenConfig calldata _tokenConfig,
        uint256[3] calldata _votingSettings
    ) external returns (DAO dao, SimpleVoting voting, address token) {
        // setup Token
        // TODO: Do we wanna leave the option not to use any proxy pattern in such case ? 
        // delegateCall is costly if so many calls are needed for a contract after the deployment.
        token = _tokenConfig.addr;
        // https://forum.openzeppelin.com/t/what-is-the-best-practice-for-initializing-a-clone-created-with-openzeppelin-contracts-proxy-clones-sol/16681
        if(token == address(0)) {
            token = Clones.clone(governanceERC20Base);
            GovernanceERC20(token).initialize(_tokenConfig.name, _tokenConfig.symbol);
        } else {
            token = Clones.clone(governanceWrappedERC20Base);
            // user already has a token. we need to wrap it in our new token to make it governance token.
            GovernanceWrappedERC20(
                token
            ).initialize(
                IERC20Upgradeable(_tokenConfig.addr),
                _tokenConfig.name,
                _tokenConfig.symbol
            );
        }

        dao = DAO(createProxy(daoBase, bytes("")));
        
        registry.register(name, dao, msg.sender);
        
        dao.initialize(
            _metadata,
            address(this)
        );

        voting = SimpleVoting(
            createProxy(
                votingBase,
                abi.encodeWithSelector(
                    SimpleVoting.initialize.selector,
                    dao,
                    token,
                    _votingSettings
                )
            )
        );

        // Grant factory DAO_CONFIG_ROLE to add a process
        dao.grant(address(dao), address(this), dao.DAO_CONFIG_ROLE());

        // Add voting process
        dao.addProcess(voting);

        ACLData.BulkItem[] memory items = new ACLData.BulkItem[](7);
        
        // Grant DAO all the permissions required
        items[0] = ACLData.BulkItem(ACLData.BulkOp.Grant, dao.DAO_CONFIG_ROLE(), address(dao));
        items[1] = ACLData.BulkItem(ACLData.BulkOp.Grant, dao.WITHDRAW_ROLE(), address(dao));
        items[2] = ACLData.BulkItem(ACLData.BulkOp.Grant, dao.UPGRADE_ROLE(), address(dao));
        items[3] = ACLData.BulkItem(ACLData.BulkOp.Grant, dao.ROOT_ROLE(), address(dao));
        items[4] = ACLData.BulkItem(ACLData.BulkOp.Grant, dao.SET_SIGNATURE_VALIDATOR_ROLE(), address(dao));

        // Revoke permissions from factory
        items[5] = ACLData.BulkItem(ACLData.BulkOp.Revoke, dao.DAO_CONFIG_ROLE(), address(this));
        items[6] = ACLData.BulkItem(ACLData.BulkOp.Revoke, dao.ROOT_ROLE(), address(this));

        dao.bulk(address(dao), items);
    }
    
    // @dev Internal helper method to set up the required base contracts on DAOFactory deployment.
    function setupBases() private {
        votingBase = address(new SimpleVoting());
        daoBase = address(new DAO());
        governanceERC20Base = address(new GovernanceERC20());
        governanceWrappedERC20Base = address(new GovernanceWrappedERC20());
    }
}
