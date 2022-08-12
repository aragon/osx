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

/// @title DAOFactory
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

    /// @notice Emitted when a new DAO is created.
    /// @param name The DAO name.
    /// @param token The [ERC-20](https://eips.ethereum.org/EIPS/eip-20) governance token address or `address(0)` if no token was created.
    /// @param voting The address of the voting component of the new DAO.
    event DAOCreated(string name, address indexed token, address indexed voting);

    /// @notice The constructor setting the registry and token factory address and creating the base contracts for the factory to clone from.
    /// @param _registry The DAO registry to register the DAO by its name.
    /// @param _tokenFactory The token factory for optional governance token creation.
    constructor(DAORegistry _registry, TokenFactory _tokenFactory) {
        daoRegistry = _registry;
        tokenFactory = _tokenFactory;

        setupBases();
    }

    /// @notice Creates a new DAO with the `ERC20Voting` component installed and deploys a new [ERC-20](https://eips.ethereum.org/EIPS/eip-20) governance token if the corresponding configuration is passed.
    /// @param _daoConfig The name and metadata hash of the DAO.
    /// @param _voteConfig The configuration used to set up the the majority voting.
    /// @param _tokenConfig The configuration used to create a new token.
    /// @param _mintConfig The configuration used to mint the newly created tokens.
    /// @param _trustedForwarder The address of the trusted forwarder required for meta transactions.
    function createERC20VotingDAO(
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

    /// @notice Creates a new DAO with the `AllowlistVoting` component installed.
    /// @param _daoConfig The name and metadata hash of the DAO.
    /// @param _voteConfig The configuration used to set up the the majority voting.
    /// @param _allowlistVoters An array of addresses that are allowed to vote.
    /// @param _trustedForwarder The address of the trusted forwarder required for meta transactions.
    function createAllowlistVotingDAO(
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

    /// @notice Creates a new DAO.
    /// @param _daoConfig The name and metadata hash of the DAO it creates.
    /// @param _trustedForwarder The forwarder address for the OpenGSN meta tx solution.
    function createDAO(DAOConfig calldata _daoConfig, address _trustedForwarder)
        internal
        returns (DAO dao)
    {
        // create dao
        dao = DAO(createProxy(daoBase, bytes("")));

        // initialize dao with the `ROOT_PERMISSION_ID` permission as DAOFactory
        dao.initialize(_daoConfig.metadata, address(this), _trustedForwarder);
    }

    /// @notice Sets the required permissions for the new DAO.
    /// @param _dao The DAO instance just created.
    /// @param _voting The voting contract address (`AllowlistVoting` or `ERC20Voting`).
    function setDAOPermissions(DAO _dao, address _voting) internal {
        // set permissionIds on the dao itself.
        BulkPermissionsLib.ItemSingleTarget[] memory items = new BulkPermissionsLib.ItemSingleTarget[](8);

        // Grant DAO all the permissions required
        items[0] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.SET_METADATA_PERMISSION_ID()
        );
        items[1] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.WITHDRAW_PERMISSION_ID()
        );
        items[2] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.UPGRADE_PERMISSION_ID()
        );
        items[3] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.ROOT_PERMISSION_ID()
        );
        items[4] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.SET_SIGNATURE_VALIDATOR_PERMISSION_ID()
        );
        items[5] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.SET_TRUSTED_FORWARDER_PERMISSION_ID()
        );
        items[6] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            _voting,
            _dao.EXECUTE_PERMISSION_ID()
        );

        // Revoke permissions from factory
        items[7] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Revoke,
            address(this),
            _dao.ROOT_PERMISSION_ID()
        );

        _dao.bulkOnSingleTarget(address(_dao), items);
    }

    /// @notice Internal helper method to create and setup an `ERC20Voting` contract for a DAO.
    /// @param _dao The associated DAO.
    /// @param _token The [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token address.
    /// @param _voteConfig The vote configuration.
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
        BulkPermissionsLib.ItemSingleTarget[] memory items = new BulkPermissionsLib.ItemSingleTarget[](3);
        items[0] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            erc20Voting.UPGRADE_PERMISSION_ID()
        );
        items[1] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            erc20Voting.SET_CONFIGURATION_PERMISSION_ID()
        );
        items[2] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            erc20Voting.SET_TRUSTED_FORWARDER_PERMISSION_ID()
        );

        _dao.bulkOnSingleTarget(address(erc20Voting), items);
    }

    /// @notice Internal helper method to create and setup an `AllowlistVoting` contract for a DAO.
    /// @param _dao The associated DAO.
    /// @param _allowlistVoters The array of the allowed voting addresses.
    /// @param _voteConfig The vote configuration.
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
        BulkPermissionsLib.ItemSingleTarget[] memory items = new BulkPermissionsLib.ItemSingleTarget[](4);
        items[0] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            allowlistVoting.MODIFY_ALLOWLIST_PERMISSION_ID()
        );
        items[1] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            allowlistVoting.SET_CONFIGURATION_PERMISSION_ID()
        );
        items[2] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            allowlistVoting.UPGRADE_PERMISSION_ID()
        );
        items[3] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            allowlistVoting.SET_TRUSTED_FORWARDER_PERMISSION_ID()
        );

        _dao.bulkOnSingleTarget(address(allowlistVoting), items);
    }

    /// @notice Internal helper method to set up the required base contracts on `DAOFactory` deployment.
    function setupBases() private {
        erc20VotingBase = address(new ERC20Voting());
        allowlistVotingBase = address(new AllowlistVoting());
        daoBase = address(new DAO());
    }
}
