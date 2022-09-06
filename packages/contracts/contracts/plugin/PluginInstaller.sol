// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {Permission, PluginManager, PluginManagerLib} from "./PluginManager.sol";
import {PluginERC1967Proxy} from "../utils/PluginERC1967Proxy.sol";
import {TransparentProxy} from "../utils/TransparentProxy.sol";
import {bytecodeAt} from "../utils/Contract.sol";

import {PluginUUPSUpgradeable} from "../core/plugin/PluginUUPSUpgradeable.sol";
import {PluginClones} from "../core/plugin/PluginClones.sol";
import {Plugin} from "../core/plugin/Plugin.sol";
import {PluginTransparentUpgradeable} from "../core/plugin/PluginTransparentUpgradeable.sol";
import {DaoAuthorizableUpgradeable} from "../core/component/DaoAuthorizableUpgradeable.sol";

import {DAO} from "../core/DAO.sol";

/// @notice Plugin Installer that has root permissions to install plugin on the dao and apply permissions.
contract PluginInstaller {
    using ERC165Checker for address;
    using Create2 for address payable;
    using Address for address;

    bytes32 public constant INSTALL_PERMISSION_ID = keccak256("INSTALL_PERMISSION");
    bytes32 public constant UPDATE_PERMISSION_ID = keccak256("UPDATE_PERMISSION");

    struct InstallPlugin {
        PluginManager manager;
        bytes data;
    }

    struct UpdatePlugin {
        PluginManager manager;
        bytes data;
        address proxy;
        uint16[3] oldVersion;
    }

    error InstallNotAllowed();
    error PluginCountTooBig();
    error UpdateNotAllowed();
    error AlreadyThisVersion();

    /// @notice Thrown after the plugin installation to detect plugin was installed on a dao.
    /// @param dao The dao address that plugin belongs to.
    /// @param plugin the plugin address.
    event PluginInstalled(address dao, address plugin, address[] helpers);

    /// @notice Thrown after the plugin installation to detect plugin was installed on a dao.
    /// @param dao The dao address that plugin belongs to.
    /// @param plugin the plugin address.
    /// @param oldVersion the old version plugin is upgrading from.
    event PluginUpdated(address dao, address plugin, uint16[3] oldVersion, bytes data);

    /// @notice Installs plugin on the dao by emitting the event and sets up permissions.
    /// @dev It's dev's responsibility to deploy the plugin inside the plugin manager.
    /// @param dao the dao address where the plugin should be installed.
    /// @param plugin the plugin struct that contains manager address and encoded data.
    function installPlugin(
        address dao,
        InstallPlugin calldata plugin,
        bytes32 salt
    ) public {
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

        bytes32 newSalt = keccak256(
            abi.encodePacked(salt, dao, address(this), plugin.manager, keccak256(plugin.data))
        );

        PluginManagerLib.Data memory installationInstructions = plugin
            .manager
            .getInstallInstruction(dao, newSalt, address(this), plugin.data);

        address[] memory helpersAddresses = new address[](installationInstructions.helpers.length);
        // Deploy the helpers
        for (uint256 i = 0; i < installationInstructions.helpers.length; i++) {
            helpersAddresses[i] = deployWithCreate2(newSalt, installationInstructions.helpers[i]);
        }

        // in PluginInstaller V1, restrict Plugin Size to be 1 always
        if (installationInstructions.plugins.length != 1) revert PluginCountTooBig();

        // Deploy the plugin
        address pluginAddr = deployWithCreate2(newSalt, installationInstructions.plugins[0]);

        DAO(payable(dao)).bulkOnMultiTarget(installationInstructions.permissions);

        emit PluginInstalled(dao, pluginAddr, helpersAddresses);
    }

    /// @notice Updates plugin on the dao by emitting the event and sets up permissions.
    /// @dev It's dev's responsibility to update the plugin inside the plugin manager.
    /// @param dao the dao address where the plugin should be updated.
    /// @param plugin the plugin struct that contains manager address, encoded data and old version.
    function updatePlugin(
        address dao,
        bytes32 salt,
        UpdatePlugin calldata plugin
    ) public {
        if (
            (dao != msg.sender &&
                !DAO(payable(dao)).hasPermission(
                    address(this),
                    msg.sender,
                    UPDATE_PERMISSION_ID,
                    bytes("")
                ))
        ) {
            revert UpdateNotAllowed();
        }

        bytes32 newSalt = keccak256(
            abi.encodePacked(salt, dao, address(this), plugin.manager, keccak256(plugin.data))
        );

        (PluginManagerLib.Data memory updateInstructions, bytes memory initData) = plugin
            .manager
            .getUpdateInstruction(
                plugin.oldVersion,
                dao,
                plugin.proxy,
                newSalt,
                address(this),
                plugin.data
            );

        if (updateInstructions.plugins.length != 0) revert PluginCountTooBig();

        for (uint256 i = 0; i < updateInstructions.helpers.length; i++) {
            deployWithCreate2(newSalt, updateInstructions.helpers[i]);
        }

        // NOTE: the same exact functions are present for both UUPS/Transparent.
        // Beacon NOT Supported for now..
        // If the proxy doesn't support upgradeToAndCall, it will fail.
        address implementationAddr = plugin.manager.getImplementationAddress();
        if (initData.length > 0) {
            PluginUUPSUpgradeable(plugin.proxy).upgradeToAndCall(implementationAddr, initData);
        } else {
            PluginUUPSUpgradeable(plugin.proxy).upgradeTo(implementationAddr);
        }

        // TODO: Since we allow users to decide not to use our pluginuupsupgradable/PluginTransparentUpgradeable since
        // they don't want to use our ACL and features we will bring inside them, we deploy such contracts with OZ's contracts
        // directly. In that case, we need to support upgrading them as well.
        DAO(payable(dao)).bulkOnMultiTarget(updateInstructions.permissions);

        emit PluginUpdated(dao, plugin.proxy, plugin.oldVersion, plugin.data);
    }

    function deployWithCreate2(bytes32 salt, PluginManagerLib.Deployment memory deployment)
        private
        returns (address deployedAddr)
    {
        deployedAddr = Create2.deploy(0, salt, deployment.initCode);

        if (deployment.initData.length > 0) {
            deployedAddr.functionCall(deployment.initData);
        }

        if (deployment.additionalInitData.length > 0) {
            deployedAddr.functionCall(deployment.additionalInitData);
        }
    }
}
