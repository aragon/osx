// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../votings/whitelist/WhitelistVoting.sol";
import "../votings/ERC20/ERC20Voting.sol";
import "../tokens/GovernanceERC20.sol";
import "../tokens/GovernanceWrappedERC20.sol";
import "../registry/Registry.sol";
import "../core/DAO.sol";
import "../utils/Proxy.sol";
import "../tokens/MerkleMinter.sol";
import "./TokenFactory.sol";

/// @title DAOFactory to create a DAO
/// @author Aragon Association - 2022
/// @notice This contract is used to create a DAO.
contract DAOFactory {
    using Address for address;
    using Clones for address;

    error MintArrayLengthMismatch(uint256 receiversArrayLength, uint256 amountsArrayLength);

    address public erc20VotingBase;
    address public whitelistVotingBase;
    address public daoBase;

    Registry public registry;
    TokenFactory public tokenFactory;

    struct DAOConfig {
        string name;
        bytes metadata;
    }

    struct VoteConfig {
        uint64 participationRequiredPct;
        uint64 supportRequiredPct;
        uint64 minDuration;
    }

    /// @notice Emitted when a new DAO is created
    /// @param name The DAO name
    /// @param token ERC20 DAO token address or address(0) no token was created
    /// @param voting The address of the voting component of the new DAO
    event DAOCreated(string name, address indexed token, address indexed voting);

    /// @dev Stores the registry and token factory address and creates the base contracts required for the factory
    /// @param _registry The DAO registry to register the DAO with his name
    /// @param _tokenFactory The Token Factory to register tokens
    constructor(Registry _registry, TokenFactory _tokenFactory) {
        registry = _registry;
        tokenFactory = _tokenFactory;

        setupBases();
    }

    /// @dev Creates a new DAO with ERC20 based voting. It also will deploy a new token if the corresponding config is passed.
    /// @param _daoConfig The name and metadata hash of the DAO it creates
    /// @param _voteConfig The majority voting configs and minimum duration of voting
    /// @param _tokenConfig The token config used to deploy a new token
    /// @param _mintConfig The config for the minter for the newly created token
    /// @param _gsnForwarder The forwarder address for the OpenGSN meta tx solution
    function newERC20VotingDAO(
        DAOConfig calldata _daoConfig,
        VoteConfig calldata _voteConfig,
        TokenFactory.TokenConfig calldata _tokenConfig,
        TokenFactory.MintConfig calldata _mintConfig,
        address _gsnForwarder
    )
        external
        returns (
            DAO dao,
            ERC20Voting voting,
            ERC20VotesUpgradeable token,
            MerkleMinter minter
        )
    {
        if (_mintConfig.receivers.length != _mintConfig.amounts.length)
            revert MintArrayLengthMismatch({
                receiversArrayLength: _mintConfig.receivers.length,
                amountsArrayLength: _mintConfig.amounts.length
            });

        dao = createDAO(_daoConfig, _gsnForwarder);

        // Create token and merkle minter
        dao.grant(address(dao), address(tokenFactory), dao.ROOT_PERMISSION_ID());
        (token, minter) = tokenFactory.newToken(dao, _tokenConfig, _mintConfig);
        dao.revoke(address(dao), address(tokenFactory), dao.ROOT_PERMISSION_ID());

        // register dao with its name and token to the registry
        // TODO: shall we add minter as well ?
        registry.register(_daoConfig.name, dao, msg.sender, address(token));

        voting = createERC20Voting(dao, token, _voteConfig);

        setDAOPermissions(dao, address(voting));

        emit DAOCreated(_daoConfig.name, address(token), address(voting));
    }

    /// @dev Creates a new DAO with whitelist based voting.
    /// @param _daoConfig The name and metadata hash of the DAO it creates
    /// @param _voteConfig The majority voting configs and minimum duration of voting
    /// @param _whitelistVoters An array of addresses that are allowed to vote
    /// @param _gsnForwarder The forwarder address for the OpenGSN meta tx solution
    function newWhitelistVotingDAO(
        DAOConfig calldata _daoConfig,
        VoteConfig calldata _voteConfig,
        address[] calldata _whitelistVoters,
        address _gsnForwarder
    ) external returns (DAO dao, WhitelistVoting voting) {
        dao = createDAO(_daoConfig, _gsnForwarder);

        // register dao with its name and token to the registry
        registry.register(_daoConfig.name, dao, msg.sender, address(0));

        voting = createWhitelistVoting(dao, _whitelistVoters, _voteConfig);

        setDAOPermissions(dao, address(voting));

        emit DAOCreated(_daoConfig.name, address(0), address(voting));
    }

    /// @dev Creates a new DAO.
    /// @param _daoConfig The name and metadata hash of the DAO it creates
    /// @param _gsnForwarder The forwarder address for the OpenGSN meta tx solution
    function createDAO(DAOConfig calldata _daoConfig, address _gsnForwarder)
        internal
        returns (DAO dao)
    {
        // create dao
        dao = DAO(createProxy(daoBase, bytes("")));
        // initialize dao with the ROOT_PERMISSION_ID as DAOFactory
        dao.initialize(_daoConfig.metadata, address(this), _gsnForwarder);
    }

    /// @dev Does set the required permissions for the new DAO.
    /// @param _dao The DAO instance just created.
    /// @param _voting The voting contract address (whitelist OR ERC20 voting)
    function setDAOPermissions(DAO _dao, address _voting) internal {
        // set permissionIDs on the dao itself.
        ACLData.BulkItem[] memory items = new ACLData.BulkItem[](8);

        // Grant DAO all the permissions required
        items[0] = ACLData.BulkItem(
            ACLData.BulkOp.Grant,
            _dao.DAO_CONFIG_PERMISSION_ID(),
            address(_dao)
        );
        items[1] = ACLData.BulkItem(
            ACLData.BulkOp.Grant,
            _dao.WITHDRAW_PERMISSION_ID(),
            address(_dao)
        );
        items[2] = ACLData.BulkItem(
            ACLData.BulkOp.Grant,
            _dao.UPGRADE_PERMISSION_ID(),
            address(_dao)
        );
        items[3] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.ROOT_PERMISSION_ID(), address(_dao));
        items[4] = ACLData.BulkItem(
            ACLData.BulkOp.Grant,
            _dao.SET_SIGNATURE_VALIDATOR_PERMISSION_ID(),
            address(_dao)
        );
        items[5] = ACLData.BulkItem(
            ACLData.BulkOp.Grant,
            _dao.MODIFY_TRUSTED_FORWARDER(),
            address(_dao)
        );
        items[6] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.EXEC_PERMISSION_ID(), _voting);

        // Revoke permissions from factory
        items[7] = ACLData.BulkItem(
            ACLData.BulkOp.Revoke,
            _dao.ROOT_PERMISSION_ID(),
            address(this)
        );

        _dao.bulk(address(_dao), items);
    }

    /// @dev Internal helper method to create ERC20Voting
    /// @param _dao The DAO address
    /// @param _token The ERC20 Upgradeable token address
    /// @param _voteConfig The ERC20 voting settings for the DAO
    function createERC20Voting(
        DAO _dao,
        ERC20VotesUpgradeable _token,
        VoteConfig calldata _voteConfig
    ) internal returns (ERC20Voting erc20Voting) {
        erc20Voting = ERC20Voting(
            createProxy(
                erc20VotingBase,
                abi.encodeWithSelector(
                    ERC20Voting.initialize.selector,
                    _dao,
                    _dao.trustedForwarder(),
                    _voteConfig.participationRequiredPct,
                    _voteConfig.supportRequiredPct,
                    _voteConfig.minDuration,
                    _token
                )
            )
        );

        // Grant dao the necessary permissions for ERC20Voting
        ACLData.BulkItem[] memory items = new ACLData.BulkItem[](3);
        items[0] = ACLData.BulkItem(
            ACLData.BulkOp.Grant,
            erc20Voting.UPGRADE_PERMISSION_ID(),
            address(_dao)
        );
        items[1] = ACLData.BulkItem(
            ACLData.BulkOp.Grant,
            erc20Voting.MODIFY_VOTE_CONFIG(),
            address(_dao)
        );
        items[2] = ACLData.BulkItem(
            ACLData.BulkOp.Grant,
            erc20Voting.MODIFY_TRUSTED_FORWARDER(),
            address(_dao)
        );

        _dao.bulk(address(erc20Voting), items);
    }

    /// @dev Internal helper method to create Whitelist Voting
    /// @param _dao The DAO address creating the Whitelist Voting
    /// @param _whitelistVoters The array of the allowed voting addresses
    /// @param _voteConfig The voting settings
    function createWhitelistVoting(
        DAO _dao,
        address[] calldata _whitelistVoters,
        VoteConfig calldata _voteConfig
    ) internal returns (WhitelistVoting whitelistVoting) {
        whitelistVoting = WhitelistVoting(
            createProxy(
                whitelistVotingBase,
                abi.encodeWithSelector(
                    WhitelistVoting.initialize.selector,
                    _dao,
                    _dao.trustedForwarder(),
                    _voteConfig.participationRequiredPct,
                    _voteConfig.supportRequiredPct,
                    _voteConfig.minDuration,
                    _whitelistVoters
                )
            )
        );

        // Grant dao the necessary permissions for WhitelistVoting
        ACLData.BulkItem[] memory items = new ACLData.BulkItem[](4);
        items[0] = ACLData.BulkItem(
            ACLData.BulkOp.Grant,
            whitelistVoting.MODIFY_WHITELIST(),
            address(_dao)
        );
        items[1] = ACLData.BulkItem(
            ACLData.BulkOp.Grant,
            whitelistVoting.MODIFY_VOTE_CONFIG(),
            address(_dao)
        );
        items[2] = ACLData.BulkItem(
            ACLData.BulkOp.Grant,
            whitelistVoting.UPGRADE_PERMISSION_ID(),
            address(_dao)
        );
        items[3] = ACLData.BulkItem(
            ACLData.BulkOp.Grant,
            whitelistVoting.MODIFY_TRUSTED_FORWARDER(),
            address(_dao)
        );

        _dao.bulk(address(whitelistVoting), items);
    }

    /// @dev Internal helper method to set up the required base contracts on DAOFactory deployment.
    function setupBases() private {
        erc20VotingBase = address(new ERC20Voting());
        whitelistVotingBase = address(new WhitelistVoting());
        daoBase = address(new DAO());
    }
}
