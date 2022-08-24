// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

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
        // bool supportsUUPS = payable(pluginAddress).supportsInterface(
        //     type(PluginUUPSUpgradable).interfaceId
        // );
        // bool supportsTransprent = payable(pluginAddress).supportsInterface(
        //     type(PluginTransparentUpgradeable).interfaceId
        // );

        // // Don't allow update if its interface doesn't allow it..
        // if (!supportsUUPS && !supportsTransprent) {
        //     revert UpdateNotAllowed();
        // }

        // address newBaseAddress = plugin.manager.getImplementationAddress();
        // if (AragonUpgradablePlugin(pluginAddress).getImplementationAddress() == newBaseAddress) {
        //     revert AlreadyThisVersion();
        // }

        // address daoOnProxy = address(DaoAuthorizableUpgradeable(payable(pluginAddress)).getDAO());
        // if (
        //     ((daoOnProxy != msg.sender || daoOnProxy != dao) &&
        //         !DAO(payable(dao)).hasPermission(
        //             address(this),
        //             msg.sender,
        //             UPDATE_PERMISSION_ID,
        //             bytes("")
        //         ))
        // ) {
        //     revert UpdateNotAllowed();
        // }

        Permission.ItemMultiTarget[] memory permissions = plugin
            .manager
            .update(dao, pluginAddress, plugin.oldVersion, plugin.data);

        address newBaseAddress = plugin.manager.getImplementationAddress();

        // if (newBaseAddress.supportsInterface(type(PluginUUPSUpgradable).interfaceId)) {
        //     if (init.length > 0) PluginUUPSUpgradable(proxy).upgradeToAndCall(newBaseAddress, init);
        //     else PluginUUPSUpgradable(proxy).upgradeTo(newBaseAddress);
        // }
        
        DAO(payable(dao)).bulkOnMultiTarget(permissions);

        emit PluginUpdated(dao, pluginAddress, plugin.oldVersion, plugin.data);
    }
}
