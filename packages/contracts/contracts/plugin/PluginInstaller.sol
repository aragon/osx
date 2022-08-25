// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

import {Permission, PluginManager} from "./PluginManager.sol";
import {PluginERC1967Proxy} from "../utils/PluginERC1967Proxy.sol";
import {PluginUUPSUpgradeable} from "../core/plugin/PluginUUPSUpgradeable.sol";
import {PluginTransparentUpgradeable} from "../core/plugin/PluginTransparentUpgradeable.sol";
import {DaoAuthorizableUpgradeable} from "../core/component/DaoAuthorizableUpgradeable.sol";

import {DAO} from "../core/DAO.sol";

/// @notice Plugin Installer that has root permissions to install plugin on the dao and apply permissions.
contract PluginInstaller {
    using ERC165Checker for address payable;

    bytes32 public constant INSTALL_PERMISSION_ID = keccak256("INSTALL_PERMISSION");
    bytes32 public constant UPDATE_PERMISSION_ID = keccak256("UPDATE_PERMISSION");

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

    /// @notice Thrown after the plugin installation to detect plugin was installed on a dao.
    /// @param dao The dao address that plugin belongs to.
    /// @param plugin the plugin address.
    event PluginInstalled(address dao, address plugin);

    /// @notice Thrown after the plugin installation to detect plugin was installed on a dao.
    /// @param dao The dao address that plugin belongs to.
    /// @param plugin the plugin address.
    /// @param oldVersion the old version plugin is upgrading from.
    event PluginUpdated(address dao, address plugin, uint16[3] oldVersion, bytes data);

    /// @notice Installs plugin on the dao by emitting the event and sets up permissions.
    /// @dev It's dev's responsibility to deploy the plugin inside the plugin manager.
    /// @param dao the dao address where the plugin should be installed.
    /// @param plugin the plugin struct that contains manager address and encoded data.
    function installPlugin(address dao, InstallPlugin calldata plugin) public {
        if (
            msg.sender != dao &&
            !DAO(payable(dao)).hasPermission(
                address(this),
                msg.sender,
                INSTALL_PERMISSION_ID,
                bytes("")
            )
        ) {
            revert InstallNotAllowed();
        }

        (address pluginAddress, Permission.ItemMultiTarget[] memory permissions) = plugin
            .manager
            .deploy(dao, plugin.data);

        DAO(payable(dao)).bulkOnMultiTarget(permissions);

        emit PluginInstalled(dao, pluginAddress);
    }

    /// @notice Updates plugin on the dao by emitting the event and sets up permissions.
    /// @dev It's dev's responsibility to update the plugin inside the plugin manager.
    /// @param dao the dao address where the plugin should be updated.
    /// @param pluginAddress the plugin address.
    /// @param plugin the plugin struct that contains manager address, encoded data and old version.
    function updatePlugin(
        address dao,
        address pluginAddress,
        UpdatePlugin calldata plugin
    ) public {
        address payable _pluginAddr = payable(pluginAddress);
        address payable _dao = payable(dao);
        Permission.ItemMultiTarget[] memory permissions;

        // address daoOnProxy = address(DaoAuthorizableUpgradeable(payable(pluginAddress)).getDAO());
        // TODO 1: Checking daoOnProxy == dao shouldn't be necessary

        if (
            (dao != msg.sender &&
                !DAO(_dao).hasPermission(
                    address(this),
                    msg.sender,
                    UPDATE_PERMISSION_ID,
                    bytes("")
                ))
        ) {
            revert UpdateNotAllowed();
        }

        bool isUUPS = _pluginAddr.supportsInterface(type(PluginUUPSUpgradeable).interfaceId);

        if (isUUPS) {
            DAO(_dao).grant(
                pluginAddress,
                address(plugin.manager),
                keccak256("UPGRADE_PERMISSION")
            );
            permissions = plugin.manager.update(dao, pluginAddress, plugin.oldVersion, plugin.data);
            DAO(_dao).revoke(
                pluginAddress,
                address(plugin.manager),
                keccak256("UPGRADE_PERMISSION")
            );
        } else {
            // TODO 2: How can we check if the proxy is `Transparent` to do things accordingly ?
            // a. If admin is pluginInstaller, supportsInterface will return false, even when it's true, So below
            //    3 line code is wrong.
            // b. So this should call `admin` function and returned result must be equal to plugin installer
            //    This mightn't be enough as what if `pluginAddr` actually contains `admin` function, but
            //    is not Transparent Proxy type ?
            // bool isTransparent = _pluginAddr.supportsInterface(
            //     type(PluginTransparentUpgradeable).interfaceId
            // );
            // TODO 3:
            // Admin would be `PluginInstaller`. Now, since update logic resides inside
            // plugin manager, plugin manager should have the permission on the proxy to upgrade it.
            // PluginInstaller can call `changeAdmin` on TransparentUpgradeableProxy by which
            // PluginManager becomes the admin, does the upgrade, but PROBLEM is that
            // PluginInstaller after `update` call of plugin manager, can't change it back so it becomes admin again.
            // Only plugin manager can change it back to plugin installer which just complicates everything...
        }

        DAO(_dao).bulkOnMultiTarget(permissions);

        emit PluginUpdated(dao, pluginAddress, plugin.oldVersion, plugin.data);
    }
}
