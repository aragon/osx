// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import "./PluginManager.sol";
import "./PluginConstants.sol";
import "../core/DAO.sol";
import "../utils/PluginERC1967Proxy.sol";
import {AragonUpgradablePlugin} from "../core/plugin/AragonUpgradablePlugin.sol";
import {AragonPlugin} from "../core/plugin/AragonPlugin.sol";

/// @notice Plugin Installer that has root permissions to install plugin on the dao and apply permissions.
contract PluginInstaller is PluginConstants {
    using ERC165Checker for address payable;

    struct InstallPlugin {
        PluginManager manager;
        bytes data;
    }

    struct UpdatePlugin {
        PluginManager manager;
        bytes data;
        uint16[3] oldVersion;
    }

    error InstallNotAllowed();
    error UpdateNotAllowed();
    error AlreadyThisVersion();

    /// @notice Thrown if there's a mismatch between the lengths.
    /// @param relatedContractsLength the dev's relatedContract's array length.
    /// @param helperNamesLength the length of helperNames
    error LengthMismatch(uint256 relatedContractsLength, uint256 helperNamesLength);

    /// @notice Thrown after the plugin installation to detect plugin was installed on a dao.
    /// @param dao The dao address that plugin belongs to.
    /// @param proxy The proxy address of the plugin.
    event PluginInstalled(address dao, address proxy);

    /// @notice Thrown after the plugin installation to detect plugin was installed on a dao.
    /// @param dao The dao address that plugin belongs to.
    /// @param proxy The proxy address of the plugin.
    /// @param oldVersion the old version plugin is upgrading from.
    event PluginUpdated(address dao, address proxy, uint16[3] oldVersion, bytes data);
    
    /// @notice Installs plugin on the dao by emitting the event and sets up permissions.
    /// @dev It's dev's responsibility to deploy the plugin inside the plugin manager.
    /// @param dao the dao address where the plugin should be installed.
    /// @param plugin the plugin struct that contains manager address and encoded data.
    function installPlugin(address dao, InstallPlugin calldata plugin) public {
        if (msg.sender != dao) {
            revert InstallNotAllowed();
        }

        (address pluginAddress, address[] memory relatedContracts) = plugin.manager.deploy(
            dao,
            plugin.data
        );

        (
            PluginManager.RequestedPermission[] memory permissions,
            string[] memory helperNames
        ) = plugin.manager.getInstallPermissions(plugin.data);

        // Extra check to ensure consistency is protected
        if (relatedContracts.length != helperNames.length) {
            revert LengthMismatch({
                relatedContractsLength: relatedContracts.length,
                helperNamesLength: helperNames.length
            });
        }

        DAO(payable(dao)).bulkOnMultiTarget(
            createFinalPermissions(dao, pluginAddress, permissions, relatedContracts)
        );

        emit PluginInstalled(dao, pluginAddress);
    }

    /// @notice Updates plugin on the dao by emitting the event and sets up permissions.
    /// @dev It's dev's responsibility to update the plugin inside the plugin manager.
    /// @param dao the dao address where the plugin should be updated.
    /// @param proxy the plugin proxy address.
    /// @param plugin the plugin struct that contains manager address, encoded data and old version.
    function updatePlugin(
        address dao,
        address proxy,
        UpdatePlugin calldata plugin
    ) public {
        bool supportsAragonPlugin = payable(proxy).supportsInterface(
            type(AragonPlugin).interfaceId
        );
        if (supportsAragonPlugin) revert UpdateNotAllowed();

        bool supportsAragonUpgradablePlugin = payable(proxy).supportsInterface(
            type(AragonUpgradablePlugin).interfaceId
        );

        // if(!supportsAragonUpgradablePlugin) {
        //     // TODO: shall we revert at least in first release to minimize errors?
        // }

        if (supportsAragonUpgradablePlugin) {
            address newBaseAddress = plugin.manager.getImplementationAddress();
            if (AragonUpgradablePlugin(proxy).getImplementationAddress() == newBaseAddress) {
                revert AlreadyThisVersion();
            }

            address daoOnProxy = address(PluginERC1967Proxy(payable(proxy)).dao());
            if (daoOnProxy != msg.sender || daoOnProxy != dao) {
                revert UpdateNotAllowed();
            }
        }

        address[] memory relatedContracts = plugin.manager.update(
            proxy,
            plugin.oldVersion,
            plugin.data
        );

        (
            PluginManager.RequestedPermission[] memory permissions,
            string[] memory helperNames
        ) = plugin.manager.getUpdatePermissions(plugin.oldVersion, plugin.data);

        // Extra check to ensure consistency is protected
        if (relatedContracts.length != helperNames.length) {
            revert LengthMismatch({
                relatedContractsLength: relatedContracts.length,
                helperNamesLength: helperNames.length
            });
        }

        DAO(payable(dao)).bulkOnMultiTarget(
            createFinalPermissions(dao, proxy, permissions, relatedContracts)
        );

        emit PluginUpdated(dao, proxy, plugin.oldVersion, plugin.data);
    }

    /// @notice Builds the final permission struct to pass the dao to bulk.
    /// @param dao the dao address
    /// @param plugin the plugin struct that contains manager address, encoded data and old version.
    /// @param permissions the permissions array received from plugin manager.
    /// @param relatedContracts related contracts that were deployed alongside the plugin.
    /// @return bulkPermissions the final permission array for the dao to bulk.
    function createFinalPermissions(
        address dao,
        address plugin,
        PluginManager.RequestedPermission[] memory permissions,
        address[] memory relatedContracts
    ) private pure returns (BulkPermissionsLib.ItemMultiTarget[] memory bulkPermissions) {
        bulkPermissions = new BulkPermissionsLib.ItemMultiTarget[](permissions.length);

        for (uint256 j = 0; j < permissions.length; j++) {
            address grantee;
            address granter;

            uint256 where = permissions[j].where;
            bool isWhereAddress = permissions[j].isWhereAddress;

            uint256 who = permissions[j].who;
            bool isWhoAddress = permissions[j].isWhoAddress;

            address oracle = permissions[j].oracle;
            bytes32 permissionId = permissions[j].permissionId;

            if (where == DAO_PLACEHOLDER && who != PLUGIN_PLACEHOLDER) {
                revert("RESTRICTION: Helper can't have permission on dao through installation");
            }

            // Figure out grantee..
            if (where == DAO_PLACEHOLDER) grantee = dao;
            else if (where == PLUGIN_PLACEHOLDER) grantee = plugin;
            else if (isWhereAddress) grantee = address(uint160(where));
            else if (where < relatedContracts.length) grantee = relatedContracts[where];

            // Figure out granter..
            if (who == DAO_PLACEHOLDER) granter = dao;
            else if (who == PLUGIN_PLACEHOLDER) granter = plugin;
            else if (isWhoAddress) granter = address(uint160(who));
            else if (who < relatedContracts.length) granter = relatedContracts[who];

            if (grantee == address(0) && granter == address(0)) {
                revert("BUG IN PLUGIN FACTORY");
            }

            // create final permission
            bulkPermissions[j] = BulkPermissionsLib.ItemMultiTarget(
                permissions[j].op,
                grantee,
                granter,
                oracle,
                permissionId
            );
        }
    }
}
