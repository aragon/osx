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
import {PluginRepo} from "./PluginRepo.sol";

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
    error NotSupportsUpgradable();

    error PermissionsWrong();
    error PluginNotDeployed();
    error HelpersWrong();

    /// @notice Thrown after the plugin installation to detect plugin was installed on a dao.
    /// @param dao The dao address that plugin belongs to.
    /// @param plugin the plugin address.
    event PluginInstalled(address dao, address plugin);

    event Deployed(
        address sender,
        address dao,
        address plugin,
        address[] helpers,
        address pluginManager,
        bytes data,
        Permission.ItemMultiTarget[] permissions
    );

    event Updated(address dao, address[] helpers, Permission.ItemMultiTarget[] permissions);

    event PluginUpdated(address dao, address plugin);

    mapping(bytes32 => bytes32) private installPermissionHashes;
    mapping(bytes32 => bytes32) private updatePermissionHashes;

    mapping(bytes32 => bytes32) private helperHashes;

    PluginRepo public apm;

    constructor(PluginRepo _apm) {
        apm = _apm;
    }

    // TODO: protect it only to be called by us(aragon)
    // and move it below..
    function setApm(PluginRepo _apm) external {
        apm = _apm;
    }

    function deployInstall(
        address dao,
        address pluginManager,
        bytes memory data // encoded per pluginManager's deploy ABI
    ) public returns (Permission.ItemMultiTarget[] memory) {
        (
            address plugin,
            address[] memory helpers,
            Permission.ItemMultiTarget[] memory permissions
        ) = PluginManager(pluginManager).deploy(dao, data);

        // IMPORTANT: if the same plugin manager returns the same `plugin` address each time
        // but with different permissions each time, 2 things might happen.
        // 1.
        // i. one calls deployInstall, then creates installPlugin proposal.
        // ii. one calls deployInstall again(which will overwrite 1st deployInstall's permissions),
        // then calls installPlugin proposal.. One of the tx will fail in the end. not a security problem.

        // 2.
        // after first plugin is deployed/installed, one calls deploy again(Which returns the same address)
        // but with different permissions, all the checks will succeed in installPlugin which is a breach.
        // maybe better to remove delete installPermissionHashes[hash]; but then it becomes possible to call installPlugin 2 times
        // which not ideal as well. we need a solution without any extra state variable.. Thoughts ? 

        // important safety measure to include dao + plugin manager in the encoding.
        bytes32 hash = keccak256(abi.encode(dao, pluginManager, plugin));

        installPermissionHashes[hash] = getPermissionsHash(permissions);
        helperHashes[hash] = keccak256(abi.encode(helpers));

        emit Deployed(msg.sender, dao, plugin, helpers, pluginManager, data, permissions);

        return permissions;
    }

    function installPlugin(
        address dao,
        address pluginManager,
        address plugin,
        Permission.ItemMultiTarget[] calldata permissions
    ) public {
        // make sure only dao calls it...
        if (msg.sender != dao) {
            revert InstallNotAllowed();
        }

        bytes32 hash = keccak256(abi.encode(dao, pluginManager, plugin));
        bytes32 permissionHash = installPermissionHashes[hash];

        // check if plugin was actually deployed..
        if (permissionHash == bytes32(0)) {
            revert PluginNotDeployed();
        }

        // check that permissions weren't tempered.
        if (permissionHash != getPermissionsHash(permissions)) {
            revert PermissionsWrong();
        }

        // apply permissions on a dao..
        DAO(payable(dao)).bulkOnMultiTarget(permissions);

        // emit the event to connect plugin to the dao.
        emit PluginInstalled(dao, plugin);

        // IMPORTANT: if we don't clear out, it's possible to call `installPlugin`
        // 2 times and install the same plugin(same address) twice + refund is a good option.
        delete installPermissionHashes[hash];
    }

    // TODO: might we need to check when `deployUpdate` gets called, if plugin actually was installed ? 
    // Though problematic, since this check only happens when plugin updates from 1.0 to 1.x
    // and checking it always would cost more... shall we still check it and how ? 
    function deployUpdate(
        address dao,
        address plugin,
        address oldPluginManager,
        address newPluginManager,
        address[] calldata helpers, // helpers that were deployed when installing/updating the plugin.
        bytes memory data // encoded per pluginManager's update ABI,
    ) public returns (Permission.ItemMultiTarget[] memory, bytes memory) {
        // check that plugin inherits from PluginUUPSUpgradeable
        if (plugin.supportsInterface(type(PluginUUPSUpgradeable).interfaceId)) {
            revert NotSupportsUpgradable();
        }

        // Implicitly confirms that oldPluginManager exists on APM...
        (uint16[3] memory oldVersion, , ) = apm.getVersionByPluginManager(oldPluginManager);

        // Reverts if newPluginManager doesn't exist on the APM...
        apm.getVersionByPluginManager(newPluginManager);

        (
            address[] memory activeHelpers,
            bytes memory initData,
            Permission.ItemMultiTarget[] memory permissions
        ) = PluginManager(newPluginManager).update(dao, plugin, helpers, data, oldVersion);

        // Check if helpers are correct...
        bytes32 oldHash = keccak256(abi.encode(dao, oldPluginManager, plugin));
        if (helperHashes[oldHash] != keccak256(abi.encode(helpers))) {
            revert HelpersWrong();
        }

        delete helperHashes[oldHash];

        // add new helpers for the future update checks
        bytes32 newHash = keccak256(abi.encode(dao, newPluginManager, plugin));
        helperHashes[newHash] = keccak256(abi.encode(activeHelpers));

        // check if permissions are corret.
        updatePermissionHashes[newHash] = getPermissionsHash(permissions);

        emit Updated(dao, activeHelpers, permissions);

        return (permissions, initData);
    }

    function updatePlugin(
        address dao,
        address plugin, // proxy contract
        address pluginManager, // new plugin manager upgrade happens to.
        bytes memory initData,
        Permission.ItemMultiTarget[] calldata permissions
    ) public {
        // make sure only dao calls it...
        require(msg.sender == dao);

        bytes32 hash = keccak256(abi.encode(dao, pluginManager, plugin));

        require(updatePermissionHashes[hash] == getPermissionsHash(permissions));

        upgradeProxy(plugin, PluginManager(pluginManager).getImplementationAddress(), initData);

        DAO(payable(dao)).bulkOnMultiTarget(permissions);

        emit PluginUpdated(dao, plugin); // TODO: some other parts might be needed..
    }

    function getPermissionsHash(Permission.ItemMultiTarget[] memory permissions)
        private
        pure
        returns (bytes32)
    {
        bytes memory encoded;
        for (uint256 i = 0; i < permissions.length; i++) {
            Permission.ItemMultiTarget memory p = permissions[i];
            encoded = abi.encodePacked(encoded, p.operation, p.where, p.who, p.oracle, p.permissionId);
        }

        return keccak256(encoded);
    }

    function upgradeProxy(
        address proxy,
        address implementation,
        bytes memory initData
    ) private {
        // TODO: check if proxy is a contract
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
