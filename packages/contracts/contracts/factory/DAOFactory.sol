// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../voting/allowlist/AllowlistVoting.sol";
import "../voting/erc20/ERC20Voting.sol";
import "../tokens/GovernanceERC20.sol";
import "../tokens/GovernanceWrappedERC20.sol";
import "../registry/DAORegistry.sol";
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
    address public allowlistVotingBase;
    address public daoBase;

    DAORegistry public daoRegistry;
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
    constructor(DAORegistry _registry, TokenFactory _tokenFactory) {
        daoRegistry = _registry;
        tokenFactory = _tokenFactory;

        setupBases();
    }

    /// @dev Creates a new DAO with ERC20 based voting. It also will deploy a new token if the corresponding config is passed.
    /// @param _daoConfig The name and metadata hash of the DAO it creates
    /// @param _voteConfig The majority voting configs and minimum duration of voting
    /// @param _tokenConfig The token config used to deploy a new token
    /// @param _mintConfig The config for the minter for the newly created token
    /// @param _trustedForwarder The forwarder address for the OpenGSN meta tx solution
    function newERC20VotingDAO(
        DAOConfig calldata _daoConfig,
        VoteConfig calldata _voteConfig,
        TokenFactory.TokenConfig calldata _tokenConfig,
        TokenFactory.MintConfig calldata _mintConfig,
        address _trustedForwarder
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

        dao = createDAO(_daoConfig, _trustedForwarder);

        // Create token and merkle minter
        dao.grant(address(dao), address(tokenFactory), dao.ROOT_PERMISSION_ID());
        (token, minter) = tokenFactory.createToken(dao, _tokenConfig, _mintConfig);
        dao.revoke(address(dao), address(tokenFactory), dao.ROOT_PERMISSION_ID());

        daoRegistry.register(_daoConfig.name, dao, msg.sender);

        voting = createERC20Voting(dao, token, _voteConfig);

        setDAOPermissions(dao, address(voting));

        emit DAOCreated(_daoConfig.name, address(token), address(voting));
    }

    /// @dev Creates a new DAO with allowlist based voting.
    /// @param _daoConfig The name and metadata hash of the DAO it creates
    /// @param _voteConfig The majority voting configs and minimum duration of voting
    /// @param _allowlistVoters An array of addresses that are allowed to vote
    /// @param _trustedForwarder The forwarder address for the OpenGSN meta tx solution
    function newAllowlistVotingDAO(
        DAOConfig calldata _daoConfig,
        VoteConfig calldata _voteConfig,
        address[] calldata _allowlistVoters,
        address _trustedForwarder
    ) external returns (DAO dao, AllowlistVoting voting) {
        dao = createDAO(_daoConfig, _trustedForwarder);

        daoRegistry.register(_daoConfig.name, dao, msg.sender);

        voting = createAllowlistVoting(dao, _allowlistVoters, _voteConfig);

        setDAOPermissions(dao, address(voting));

        emit DAOCreated(_daoConfig.name, address(0), address(voting));
    }

    /// @dev Creates a new DAO.
    /// @param _daoConfig The name and metadata hash of the DAO it creates
    /// @param _trustedForwarder The forwarder address for the OpenGSN meta tx solution
    function createDAO(DAOConfig calldata _daoConfig, address _trustedForwarder)
        internal
        returns (DAO dao)
    {
        // create dao
        dao = DAO(createProxy(daoBase, bytes("")));

        // initialize dao with the `ROOT_PERMISSION_ID` permission as DAOFactory
        dao.initialize(_daoConfig.metadata, address(this), _trustedForwarder);
    }

    /// @dev Does set the required permissions for the new DAO.
    /// @param _dao The DAO instance just created.
    /// @param _voting The voting contract address (allowlist OR ERC20 voting)
    function setDAOPermissions(DAO _dao, address _voting) internal {
        // set permissionIDs on the dao itself.
        BulkPermissionsLib.Item[] memory items = new BulkPermissionsLib.Item[](8);

        // Grant DAO all the permissions required
        items[0] = BulkPermissionsLib.Item(
            BulkPermissionsLib.Operation.Grant,
            _dao.SET_METADATA_PERMISSION_ID(),
            address(_dao)
        );
        items[1] = BulkPermissionsLib.Item(
            BulkPermissionsLib.Operation.Grant,
            _dao.WITHDRAW_PERMISSION_ID(),
            address(_dao)
        );
        items[2] = BulkPermissionsLib.Item(
            BulkPermissionsLib.Operation.Grant,
            _dao.UPGRADE_PERMISSION_ID(),
            address(_dao)
        );
        items[3] = BulkPermissionsLib.Item(
            BulkPermissionsLib.Operation.Grant,
            _dao.ROOT_PERMISSION_ID(),
            address(_dao)
        );
        items[4] = BulkPermissionsLib.Item(
            BulkPermissionsLib.Operation.Grant,
            _dao.SET_SIGNATURE_VALIDATOR_PERMISSION_ID(),
            address(_dao)
        );
        items[5] = BulkPermissionsLib.Item(
            BulkPermissionsLib.Operation.Grant,
            _dao.SET_TRUSTED_FORWARDER_PERMISSION_ID(),
            address(_dao)
        );
        items[6] = BulkPermissionsLib.Item(
            BulkPermissionsLib.Operation.Grant,
            _dao.EXEC_PERMISSION_ID(),
            _voting
        );

        // Revoke permissions from factory
        items[7] = BulkPermissionsLib.Item(
            BulkPermissionsLib.Operation.Revoke,
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
                    _dao.getTrustedForwarder(),
                    _voteConfig.participationRequiredPct,
                    _voteConfig.supportRequiredPct,
                    _voteConfig.minDuration,
                    _token
                )
            )
        );

        // Grant dao the necessary permissions for ERC20Voting
        BulkPermissionsLib.Item[] memory items = new BulkPermissionsLib.Item[](3);
        items[0] = BulkPermissionsLib.Item(
            BulkPermissionsLib.Operation.Grant,
            erc20Voting.UPGRADE_PERMISSION_ID(),
            address(_dao)
        );
        items[1] = BulkPermissionsLib.Item(
            BulkPermissionsLib.Operation.Grant,
            erc20Voting.CHANGE_VOTE_CONFIG_PERMISSION_ID(),
            address(_dao)
        );
        items[2] = BulkPermissionsLib.Item(
            BulkPermissionsLib.Operation.Grant,
            erc20Voting.SET_TRUSTED_FORWARDER_PERMISSION_ID(),
            address(_dao)
        );

        _dao.bulk(address(erc20Voting), items);
    }

    /// @dev Internal helper method to create Allowlist Voting
    /// @param _dao The DAO address creating the Allowlist Voting
    /// @param _allowlistVoters The array of the allowed voting addresses
    /// @param _voteConfig The voting settings
    function createAllowlistVoting(
        DAO _dao,
        address[] calldata _allowlistVoters,
        VoteConfig calldata _voteConfig
    ) internal returns (AllowlistVoting allowlistVoting) {
        allowlistVoting = AllowlistVoting(
            createProxy(
                allowlistVotingBase,
                abi.encodeWithSelector(
                    AllowlistVoting.initialize.selector,
                    _dao,
                    _dao.getTrustedForwarder(),
                    _voteConfig.participationRequiredPct,
                    _voteConfig.supportRequiredPct,
                    _voteConfig.minDuration,
                    _allowlistVoters
                )
            )
        );

        // Grant dao the necessary permissions for AllowlistVoting
        BulkPermissionsLib.Item[] memory items = new BulkPermissionsLib.Item[](4);
        items[0] = BulkPermissionsLib.Item(
            BulkPermissionsLib.Operation.Grant,
            allowlistVoting.MODIFY_ALLOWLIST_PERMISSION_ID(),
            address(_dao)
        );
        items[1] = BulkPermissionsLib.Item(
            BulkPermissionsLib.Operation.Grant,
            allowlistVoting.CHANGE_VOTE_CONFIG_PERMISSION_ID(),
            address(_dao)
        );
        items[2] = BulkPermissionsLib.Item(
            BulkPermissionsLib.Operation.Grant,
            allowlistVoting.UPGRADE_PERMISSION_ID(),
            address(_dao)
        );
        items[3] = BulkPermissionsLib.Item(
            BulkPermissionsLib.Operation.Grant,
            allowlistVoting.SET_TRUSTED_FORWARDER_PERMISSION_ID(),
            address(_dao)
        );

        _dao.bulk(address(allowlistVoting), items);
    }

    /// @dev Internal helper method to set up the required base contracts on DAOFactory deployment.
    function setupBases() private {
        erc20VotingBase = address(new ERC20Voting());
        allowlistVotingBase = address(new AllowlistVoting());
        daoBase = address(new DAO());
    }
}
