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
    // Way 1
    // require(dao.isValidSignature(plugin, signature));

    //
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
    error UpgradeNotExistOnProxy();

    /// @notice Thrown after the plugin installation to detect plugin was installed on a dao.
    /// @param dao The dao address that plugin belongs to.
    /// @param plugin the plugin address.
    event PluginInstalled(address dao, address plugin, address[] helpers);

    /// @notice Thrown after the plugin installation to detect plugin was installed on a dao.
    /// @param dao The dao address that plugin belongs to.
    /// @param plugin the plugin address.
    /// @param oldVersion the old version plugin is upgrading from.
    event PluginUpdated(address dao, address plugin, uint16[3] oldVersion, bytes data);

    mapping(bytes32 => bytes32) private permissionHashesV2;

    // Calling this should be possible without proposal, but directly..
    // problem is, i can call it for another dao with my own params
    function deployInstall(
        address dao,
        address pluginManager,
        bytes memory data // encoded per pluginManager's deploy ABI
    ) public {
        (
            address plugin, 
            address[] helpers, // not required, but just in case
            PermissionManagerLib.ItemMultiTarget[] memory permissions
        ) = pluginManager.deploy(dao, data);

        permissionHashesV2[
            keccak256(abi.encode(dao, pluginManager, keccak256(data)))
        ] = getHash(permissions);

        // Gets stored in a subgraph.
        emit PluginInstallDeployed(
            msg.sender, 
            dao, 
            plugin, 
            helpers,
            pluginManager, 
            data, 
            permissions
        );
        

        // with weiroll, that's how it would work.
        return permissions;
    }

    function installPlugin(
        address dao,
        bytes memory _hash,
        PermissionManagerLib.ItemMultiTarget calldata permissions
    ) public {
        // make sure only dao calls it...
        require(msg.sender == dao);

        require(permissionHashesV2[_hash] == getHash(permissions));

        DAO(payable(dao)).bulkOnMultiTarget(permissions);

        emit PluginInstalled(dao, _plugin, _helpers);

        // TODO: Might be even good to do: lazy to think now.
        delete permissionHashesV2[_hash];
    }

    function deployUpdate(
        address dao,
        address pluginManager, // plugin manager v2
        bytes memory data, // encoded per pluginManager's update ABI,
        uint[3] memory oldVersion
    ) public {
        (
            address[] helpers, // not required, but just in case (newHelpers deployed if needed)
            PermissionManagerLib.ItemMultiTarget[] memory permissions
        ) = pluginManager.update(dao, data);

        // TODO: we might need separate/different mapping
        permissionHashesV2[
            keccak256(abi.encode(dao, pluginManager, keccak256(data)))
        ] = getHash(permissions);

        emit PluginUpdateDeployed(
            dao,
            helpers,
            permissions
        );

        return permissions;
    }
    
    function updatePlugin(
        address dao,
        address plugin,
        bytes memory _hash,
        bytes memory initData,
        PermissionManagerLib.ItemMultiTarget calldata permissions
    ) public {
        // make sure only dao calls it...
        require(msg.sender == dao);

        require(plugin.supportsInterface(type(PluginUUPSUpgradable).interfaceId));

        plugin.upgradeToAndCall(plugin.getImplementationAddress(), initData);

        DAO(payable(dao)).bulkOnMultiTarget(permissions);
    }

    function getHash(
        PermissionManagerLib.ItemMultiTarget[] memory permissions
    ) private returns (bytes32) {
        bytes memory encoded;
        for (uint256 i = 0; i < permissions.length; i++) {
            PermissionManagerLib.ItemMultiTarget memory p = permissions[i];
            encoded = abi.encodePacked(hash, p.Op, p.where, p.who, p.oracle, p.permissionId);
        }

        return keccak256(encoded);
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
        upgradeProxy(plugin.proxy, implementationAddr, initData);

        // TODO: Since we allow users to decide not to use our pluginuupsupgradable/PluginTransparentUpgradeable since
        // they don't want to use our ACL and features we will bring inside them,
        // we deploy such contracts with OZ's contracts directly.
        // In that case, we need to support upgrading them as well.
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

    function upgradeProxy(
        address proxy,
        address implementation,
        bytes memory initData
    ) private {
        if (initData.length > 0) {
            try
                PluginUUPSUpgradeable(proxy).upgradeToAndCall(implementation, initData)
            {} catch Error(string memory reason) {
                revert(reason);
            } catch (
                bytes memory /*lowLevelData*/
            ) {
                revert UpgradeNotExistOnProxy();
            }
        } else {
            try PluginUUPSUpgradeable(proxy).upgradeTo(implementation) {} catch Error(
                string memory reason
            ) {
                revert(reason);
            } catch (
                bytes memory /*lowLevelData*/
            ) {
                revert UpgradeNotExistOnProxy();
            }
        }
    }
}
