/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./../tokens/GovernanceERC20.sol";
import "./../tokens/GovernanceWrappedERC20.sol";
import "./../registry/Registry.sol";
import "../utils/Proxy.sol";
import "../tokens/MerkleMinter.sol";
import "./PackageInstaller.sol";
import "../utils/UncheckedIncrement.sol";

/// @title DAOFactory to create a DAO
/// @author Giorgi Lagidze & Samuel Furter - Aragon Association - 2022
/// @notice This contract is used to create a DAO.
contract DAOFactory is PackageInstaller {
    using Address for address;
    using Clones for address;

    address public daoBase;

    Registry public registry;

    struct DAOConfig {
        string name;
        bytes metadata;
        address gsnForwarder;
    }

    // @dev Stores the registry and token factory address and creates the base contracts required for the factory
    // @param _registry The DAO registry to register the DAO with his name
    // @param _tokenFactory The Token Factory to register tokens
    constructor(Registry _registry, address _tokenFactory) PackageInstaller(_tokenFactory) {
        registry = _registry;

        setupBases();
    }

    function createDAOWithPackages(DAOConfig calldata _daoConfig, Package[] calldata packages)
        external
        returns (DAO dao)
    {
        dao = createDAO(_daoConfig);

        for (uint256 i; i < packages.length; i = _uncheckedIncrement(i)) {
            installPackage(dao, packages[i]);
        }

        setDAOPermissions(dao);
    }

    // @dev Creates a new DAO.
    // @oaram _daoConfig The name and metadata hash of the DAO it creates
    // @param _gsnForwarder The forwarder address for the OpenGSN meta tx solution
    function createDAO(DAOConfig calldata _daoConfig) internal returns (DAO dao) {
        // create dao
        dao = DAO(createProxy(daoBase, bytes("")));
        // initialize dao with the ROOT_ROLE as DAOFactory
        dao.initialize(_daoConfig.metadata, address(this), _daoConfig.gsnForwarder);
        // register dao with its name and token to the registry
        registry.register(dao, msg.sender, _daoConfig.name);
    }

    // @dev Does set the required permissions for the new DAO.
    // @param _dao The DAO instance just created.
    // @param _voting The voting contract address (whitelist OR ERC20 voting)
    function setDAOPermissions(DAO _dao) internal {
        // set roles on the dao itself.
        ACLData.BulkItem[] memory items = new ACLData.BulkItem[](7);

        // Grant DAO all the permissions required
        items[0] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.DAO_CONFIG_ROLE(), address(_dao));
        items[1] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.WITHDRAW_ROLE(), address(_dao));
        items[2] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.UPGRADE_ROLE(), address(_dao));
        items[3] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.ROOT_ROLE(), address(_dao));
        items[4] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.SET_SIGNATURE_VALIDATOR_ROLE(), address(_dao));
        items[5] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.MODIFY_TRUSTED_FORWARDER(), address(_dao));

        // Revoke permissions from factory
        items[6] = ACLData.BulkItem(ACLData.BulkOp.Revoke, _dao.ROOT_ROLE(), address(this));

        _dao.bulk(address(_dao), items);
    }

    // @dev Internal helper method to set up the required base contracts on DAOFactory deployment.
    function setupBases() private {
        daoBase = address(new DAO());
    }
}
