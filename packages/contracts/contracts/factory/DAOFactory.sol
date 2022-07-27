// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../tokens/GovernanceERC20.sol";
import "../tokens/GovernanceWrappedERC20.sol";
import "../registry/DAORegistry.sol";
import "../core/DAO.sol";
import "../utils/Proxy.sol";
import "../tokens/MerkleMinter.sol";
import "./TokenFactory.sol";
import "../plugin/PluginInstaller.sol";

/// @title DAOFactory to create a DAO
/// @author Aragon Association - 2022
/// @notice This contract is used to create a DAO.
contract DAOFactory {
    using Address for address;
    using Clones for address;

    address public daoBase;

    DAORegistry public daoRegistry;
    PluginInstaller public pluginInstaller;

    struct DAOConfig {
        string name;
        bytes metadata;
    }

    /// @notice Emitted when a new DAO is created
    /// @param name The DAO name
    /// @param token ERC20 DAO token address or address(0) no token was created
    /// @param voting The address of the voting component of the new DAO
    event DAOCreated(string name, address indexed token, address indexed voting);

    /// @dev Stores the registry and token factory address and creates the base contracts required for the factory
    /// @param _registry The DAO registry to register the DAO with his name
    /// @param _pluginInstaller
    constructor(DAORegistry _registry, PluginInstaller _pluginInstaller) {
        daoRegistry = _registry;
        pluginInstaller = _pluginInstaller;

        daoBase = address(new DAO());
    }

    /// @dev Creates a new DAO.
    /// @param _daoConfig The name and metadata hash of the DAO it creates
    /// @param _gsnForwarder The forwarder address for the OpenGSN meta tx solution
    /// @param _pluginsConfigs list of plugins to be installed on the dao
    function createDAO(
        DAOConfig calldata _daoConfig,
        address _gsnForwarder,
        PluginInstaller.PluginConfig[] calldata _pluginsConfigs
    ) internal returns (DAO dao) {
        // create dao
        dao = DAO(createProxy(daoBase, bytes("")));
        // initialize dao with the ROOT_ROLE as DAOFactory
        dao.initialize(_daoConfig.metadata, address(this), _gsnForwarder);

        // install plugins
        pluginInstaller.installPlugins(dao, _pluginsConfigs);

        // finish up dao permission
        setDAOPermissions(dao);
    }

    /// @dev Does set the required permissions for the new DAO.
    /// @param _dao The DAO instance just created.
    function setDAOPermissions(DAO _dao) internal {
        // set roles on the dao itself.
        ACLData.BulkItem[] memory items = new ACLData.BulkItem[](8);

        // Grant DAO all the permissions required
        items[0] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.DAO_CONFIG_ROLE(), address(_dao));
        items[1] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.WITHDRAW_ROLE(), address(_dao));
        items[2] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.UPGRADE_ROLE(), address(_dao));
        items[3] = ACLData.BulkItem(ACLData.BulkOp.Grant, _dao.ROOT_ROLE(), address(_dao));
        items[4] = ACLData.BulkItem(
            ACLData.BulkOp.Grant,
            _dao.SET_SIGNATURE_VALIDATOR_ROLE(),
            address(_dao)
        );
        items[5] = ACLData.BulkItem(
            ACLData.BulkOp.Grant,
            _dao.MODIFY_TRUSTED_FORWARDER(),
            address(_dao)
        );

        // Revoke permissions from factory
        items[6] = ACLData.BulkItem(ACLData.BulkOp.Revoke, _dao.ROOT_ROLE(), address(this));

        _dao.bulk(address(_dao), items);
    }
}
