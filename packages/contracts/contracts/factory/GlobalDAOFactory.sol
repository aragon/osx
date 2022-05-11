/*
 * SPDX-License-Identifier:    MIT
 */

/*
    DIRTY CONTRACT - should not be used in production, this is for POC purpose only
*/

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./../tokens/GovernanceERC20.sol";
import "./../tokens/GovernanceWrappedERC20.sol";
import "./../registry/Registry.sol";
import "./../core/DAO.sol";
import "../utils/Proxy.sol";
import "../tokens/MerkleMinter.sol";
import "./TokenFactory.sol";
import "../APM/IApp.sol";

/// @title DAOFactory to create a DAO
/// @author Giorgi Lagidze & Samuel Furter - Aragon Association - 2022
/// @notice This contract is used to create a DAO.
contract GlobalDAOFactory {
    using Address for address;
    using Clones for address;

    error MintArrayLengthMismatch(uint256 receiversArrayLength, uint256 amountsArrayLength);

    address public daoBase;

    Registry public registry;
    TokenFactory public tokenFactory;

    struct DAOConfig {
        string name;
        bytes metadata;
        address gsnForwarder;
    }

    struct VoteConfig {
        uint64 participationRequiredPct;
        uint64 supportRequiredPct;
        uint64 minDuration;
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

    // @dev Creates a new DAO.
    // @oaram _daoConfig The name and metadata hash of the DAO it creates
    // @param _gsnForwarder The forwarder address for the OpenGSN meta tx solution
    function createDAO(DAOConfig calldata _daoConfig, address _gsnForwarder) internal returns (DAO dao) {
        // create dao
        dao = DAO(createProxy(daoBase, bytes("")));
        // initialize dao with the ROOT_ROLE as DAOFactory
        dao.initialize(_daoConfig.metadata, address(this), _gsnForwarder);
    }

    function createToken(
        DAO dao,
        TokenFactory.TokenConfig memory _tokenConfig,
        TokenFactory.MintConfig memory _mintConfig
    ) public returns (ERC20VotesUpgradeable token, MerkleMinter minter) {
        if (_mintConfig.receivers.length != _mintConfig.amounts.length)
            revert MintArrayLengthMismatch({
                receiversArrayLength: _mintConfig.receivers.length,
                amountsArrayLength: _mintConfig.amounts.length
            });

        dao.grant(address(dao), address(tokenFactory), dao.ROOT_ROLE());
        (token, minter) = tokenFactory.newToken(dao, _tokenConfig, _mintConfig);
        dao.revoke(address(dao), address(tokenFactory), dao.ROOT_ROLE());
    }

    struct Package {
        address factoryAddress; // package deployer (factory) address, hopefully from APM
        bytes32[] PackagePermissions; // to be granted to DAO
        bytes32[] DAOPermissions; // Dao permission to be granted to package like: exec_role
        bytes args; // pre-determined value for stting up the package
    }

    function createDAOWithPackages(DAOConfig calldata _daoConfig, Package[] calldata packages)
        public
        returns (DAO dao)
    {
        // create dao
        dao = DAO(createProxy(daoBase, bytes("")));
        // initialize dao with the ROOT_ROLE as DAOFactory
        dao.initialize(_daoConfig.metadata, address(this), _daoConfig.gsnForwarder);
        // register dao with its name and token to the registry
        registry.register(_daoConfig.name, dao, msg.sender, address(0));

        // TODO: perhaps having a stack of address could be usefull for relationship between apps.
        // stack of address
        // address[] memory addressStack;

        // install packaes on Dao
        for (uint256 i = 0; i < packages.length; i++) {
            address app = IApp(packages[i].factoryAddress).deploy(address(dao), packages[i].args);

            // addressStack[i] = app;

            // Grant dao the necessary permissions on the package
            ACLData.BulkItem[] memory packageItems = new ACLData.BulkItem[](packages[i].PackagePermissions.length);
            for (uint256 j = 0; j < packages[i].PackagePermissions.length; j++) {
                packageItems[j] = ACLData.BulkItem(
                    ACLData.BulkOp.Grant,
                    packages[i].PackagePermissions[j],
                    address(dao)
                );
            }
            dao.bulk(app, packageItems);

            // Grant Package the necessary permissions on the DAO
            ACLData.BulkItem[] memory daoItems = new ACLData.BulkItem[](packages[i].DAOPermissions.length);
            for (uint256 j = 0; j < packages[i].DAOPermissions.length; j++) {
                daoItems[j] = ACLData.BulkItem(ACLData.BulkOp.Grant, packages[i].DAOPermissions[j], app);
            }
            dao.bulk(address(dao), daoItems);
        }

        setDAOPermissions(dao);
    }

    // @dev Does set the required permissions for the new DAO.
    // @param _dao The DAO instance just created.
    // @param _voting The voting contract address (whitelist OR ERC20 voting)
    function setDAOPermissions(
        DAO _dao /*, address _voting*/
    ) internal {
        // set roles on the dao itself.
        ACLData.BulkItem[] memory items = new ACLData.BulkItem[](7);

        // Grant DAO all the permissions required
        items[0] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.DAO_CONFIG_ROLE(), address(_dao));
        items[1] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.WITHDRAW_ROLE(), address(_dao));
        items[2] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.UPGRADE_ROLE(), address(_dao));
        items[3] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.ROOT_ROLE(), address(_dao));
        items[4] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.SET_SIGNATURE_VALIDATOR_ROLE(), address(_dao));
        items[5] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.MODIFY_TRUSTED_FORWARDER(), address(_dao));
        // items[6] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.EXEC_ROLE(), _voting);

        // Revoke permissions from factory
        items[6] = ACLData.BulkItem(ACLData.BulkOp.Revoke, _dao.ROOT_ROLE(), address(this));

        _dao.bulk(address(_dao), items);
    }

    // @dev Internal helper method to set up the required base contracts on DAOFactory deployment.
    function setupBases() private {
        daoBase = address(new DAO());
    }
}
