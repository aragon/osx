// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import { Permission, PluginManager } from "./PluginManager.sol";
import { PluginERC1967Proxy } from "../utils/PluginERC1967Proxy.sol";
import { AragonUpgradablePlugin } from "../core/plugin/AragonUpgradablePlugin.sol";
import { AragonPlugin } from "../core/plugin/AragonPlugin.sol";
import { DAO } from "../core/DAO.sol";

/// @notice Plugin Installer that has root permissions to install plugin on the dao and apply permissions.
contract PluginInstaller {
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

        (address pluginAddress, Permission.ItemMultiTarget[] memory permissions) = plugin.manager.deploy(
            dao,
            plugin.data
        );

        DAO(payable(dao)).bulkOnMultiTarget(permissions);

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

        Permission.ItemMultiTarget[] memory permissions = plugin.manager.update(
            dao,
            proxy,
            plugin.oldVersion,
            plugin.data
        );

        DAO(payable(dao)).bulkOnMultiTarget(permissions);

        emit PluginUpdated(dao, proxy, plugin.oldVersion, plugin.data);
    }
}
