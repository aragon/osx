/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./../tokens/GovernanceERC20.sol";
import "./../tokens/GovernanceWrappedERC20.sol";
import "./../registry/ERC165ContractRegistry.sol";
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

    ERC165ContractRegistry public idaoRegistry;

    struct DAOConfig {
        string name;
        bytes metadata;
        address gsnForwarder;
    }

    /// @notice Emitted if a new DAO is registered
    /// @param dao The address of the DAO contract
    /// @param creator The address of the creator
    /// @param name The name of the DAO
    event NewDAORegistered(IDAO indexed dao, address indexed creator, string name);

    /// @notice Stores the registry and token factory address and creates the base contracts required for the factory.
    /// @dev This assumes that the registry is already initialized.
    /// @param _registry The DAO registry to register the DAO with his name
    /// @param _tokenFactory The Token Factory to register tokens
    constructor(ERC165ContractRegistry _registry, address _tokenFactory)
        PackageInstaller(_tokenFactory)
    {
        idaoRegistry = _registry;

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

    /// @notice Creates a new DAO.
    /// @param _daoConfig The name and metadata hash of the DAO it creates
    function createDAO(DAOConfig calldata _daoConfig) internal returns (DAO dao) {
        // create dao
        dao = DAO(createProxy(daoBase, bytes("")));
        // initialize dao with the ROOT_ROLE as DAOFactory
        dao.initialize(_daoConfig.metadata, address(this), _daoConfig.gsnForwarder);
        // register dao with its name and token to the registry
        idaoRegistry.register(address(dao));

        emit NewDAORegistered(dao, msg.sender, _daoConfig.name); // TODO msg.sender should become _msgSender() if DAOFactory  becomes a component
    }

    /// @notice Does set the required permissions for the new DAO.
    /// @param _dao The DAO instance just created.
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

    /// @notice Internal helper method to set up the required base contracts on DAOFactory deployment.
    function setupBases() private {
        daoBase = address(new DAO());
    }
}
