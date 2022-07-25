/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@ensdomains/ens-contracts/contracts/registry/ENS.sol";

import "../core/DAO.sol";
import "../utils/UncheckedIncrement.sol";
import "./aragonPlugin/PluginUUPSProxy.sol";
import "./IPluginFactory.sol";

/// @title PluginInstaller to install plugins on a DAO.
/// @author Aragon Association - 2022
/// @notice This contract is used to create/deploy new plugins and instaling them on a DAO.
contract PluginInstaller {
    address public daoFactory;
    ENS public ens;

    struct PluginConfig {
        DAO.DAOPlugin daoPlugin;
        bytes32[] pluginPermissions; // Plugin permissions to be granted to DAO
        bytes32[] desintaionPermissions; // Dao permission to be granted to the plugin, such as: exec_role
        bytes initCallData;
    }

    error NoRootRole();
    error CallerNotAllowed();

    modifier onlyAllowedCaller(DAO dao) {
        if (msg.sender != address(dao) || msg.sender != daoFactory) {
            revert CallerNotAllowed();
        }
        _;
    }

    constructor(address _daoFactory) {
        daoFactory = _daoFactory;
    }

    function installPlugins(DAO dao, PluginConfig[] calldata pluginConfigs)
        external
        onlyAllowedCaller(dao)
    {
        for (uint256 i; i < pluginConfigs.length; i = _uncheckedIncrement(i)) {
            _installPlugin(dao, pluginConfigs[i]);
        }
    }

    function _installPlugin(DAO dao, PluginConfig calldata pluginConfig)
        internal
        returns (address pluginAddress)
    {
        bytes32 node = pluginConfig.daoPlugin.node;
        address repo = ens.resolve(node).addr(node);
        PluginRepo.Version memory pluginVersion = repo.getBySemanticVersion(
            pluginConfig.daoPlugin.semanticVersion
        );

        address pluginAddress = payable(
            address(
                new PluginUUPSProxy(
                    dao,
                    pluginVersion.implementationAddress,
                    pluginConfig.initCallData
                )
            )
        );

        // Grant dao the necessary permissions on the plugin
        ACLData.BulkItem[] memory packageItems = new ACLData.BulkItem[](
            pluginConfig.pluginPermissions.length
        );
        for (uint256 i; i < pluginConfig.pluginPermissions.length; i = _uncheckedIncrement(i)) {
            packageItems[i] = ACLData.BulkItem(
                ACLData.BulkOp.Grant,
                pluginConfig.pluginPermissions[i],
                address(dao)
            );
        }
        dao.bulk(pluginAddress, packageItems);

        // Grant plugin the necessary permissions on the DAO
        ACLData.BulkItem[] memory daoItems = new ACLData.BulkItem[](
            pluginConfig.daoPermissions.length
        );
        for (uint256 i; i < pluginConfig.daoPermissions.length; i = _uncheckedIncrement(i)) {
            daoItems[i] = ACLData.BulkItem(
                ACLData.BulkOp.Grant,
                pluginConfig.daoPermissions[i],
                pluginAddress
            );
        }
        dao.bulk(address(dao), daoItems);

        dao.setPlugin(pluginConfig.daoPlugin, pluginAddress);
    }
}
