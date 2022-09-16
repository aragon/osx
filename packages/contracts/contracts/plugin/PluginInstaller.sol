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


    
}
