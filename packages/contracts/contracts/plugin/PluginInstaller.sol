// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {Permission, PluginManager} from "./PluginManager.sol";
import {PluginERC1967Proxy} from "../utils/PluginERC1967Proxy.sol";
import {TransparentProxy} from "../utils/TransparentProxy.sol";
import {bytecodeAt} from "../utils/Contract.sol";

import {PluginUUPSUpgradeable} from "../core/plugin/PluginUUPSUpgradeable.sol";
import {PluginClones} from "../core/plugin/PluginClones.sol";
import {Plugin} from "../core/plugin/Plugin.sol";
import {PluginTransparentUpgradeable} from "../core/plugin/PluginTransparentUpgradeable.sol";
import {DaoAuthorizable} from "../core/component/DaoAuthorizable.sol";

import {DAO, IDAO} from "../core/DAO.sol";
import {PluginRepo} from "./PluginRepo.sol";
import {AragonPluginRegistry} from "../registry/AragonPluginRegistry.sol";

/// @notice Plugin Installer that has root permissions to install plugin on the dao and apply permissions.
contract PluginInstaller is DaoAuthorizable {
    using ERC165Checker for address;
    // using Create2 for address payable;
    // using Address for address;

    bytes32 public constant INSTALL_PERMISSION_ID = keccak256("INSTALL_PERMISSION");
    bytes32 public constant SET_REPO_REGISTRY_PERMISSION_ID =
        keccak256("SET_REPO_REGISTRY_PERMISSION");

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
    error UpgradeNotExistOnProxy();
    error NotSupportsUpgradable();

    error PermissionsWrong();
    error PluginNotDeployed();
    error HelpersWrong();
    error PluginRepoNotExists();
    error PluginWithTheSameAddressExists();

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
    event PluginUninstalled(address dao, address plugin);

    struct PluginUpdateDeployInfo {
        address plugin;
        PluginRepo pluginManagerRepo; // where plugin manager versions are handled.
        address oldPluginManager;
        address newPluginManager;
    }

    mapping(bytes32 => bytes32) private installPermissionHashes;
    mapping(bytes32 => bool) private pluginInstalledChecker;
    mapping(bytes32 => bytes32) private updatePermissionHashes;
    mapping(bytes32 => bytes32) private helperHashes;

    AragonPluginRegistry public repoRegistry;

    /// @dev Modifier used to check if caller is the DAO, or has given permission by the DAO.
    /// @param _dao The address of the DAO.
    modifier daoAuthorized(address _dao) {
        if (
            msg.sender != _dao &&
            !DAO(payable(_dao)).hasPermission(
                address(this),
                msg.sender,
                INSTALL_PERMISSION_ID,
                bytes("")
            )
        ) {
            revert InstallNotAllowed();
        }
        _;
    }

    constructor(AragonPluginRegistry _repoRegistry, address _dao) {
        __DaoAuthorizable_init(IDAO(_dao));
        repoRegistry = _repoRegistry;
    }

    function setRepoRegistry(AragonPluginRegistry _repoRegistry)
        external
        auth(SET_REPO_REGISTRY_PERMISSION_ID)
    {
        repoRegistry = _repoRegistry;
    }

    function deployInstall(
        address dao,
        PluginRepo pluginManagerRepo,
        address pluginManager,
        bytes memory data // encoded per pluginManager's deploy ABI
    ) public returns (Permission.ItemMultiTarget[] memory) {
        // ensure repo for plugin manager exists
        if (!repoRegistry.entries(address(pluginManagerRepo))) {
            revert PluginRepoNotExists();
        }

        // Reverts if pluginManager doesn't exist on the repo...
        pluginManagerRepo.getVersionByPluginManager(pluginManager);

        // deploy
        (
            address plugin,
            address[] memory helpers,
            Permission.ItemMultiTarget[] memory permissions
        ) = PluginManager(pluginManager).deploy(dao, data);

        // important safety measure to include dao + plugin manager in the encoding.
        bytes32 hash = keccak256(abi.encode(dao, pluginManager, plugin));

        pluginInstalledChecker[hash] = true;

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
    ) public daoAuthorized(dao) {
        bytes32 hash = keccak256(abi.encode(dao, pluginManager, plugin));

        if (pluginInstalledChecker[hash]) {
            revert PluginWithTheSameAddressExists();
        }

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

        delete installPermissionHashes[hash];
    }

    // TODO: might we need to check when `deployUpdate` gets called, if plugin actually was installed ?
    // Though problematic, since this check only happens when plugin updates from 1.0 to 1.x
    // and checking it always would cost more... shall we still check it and how ?
    function deployUpdate(
        address dao,
        PluginUpdateDeployInfo calldata updateInfo,
        address[] calldata helpers, // helpers that were deployed when installing/updating the plugin.
        bytes memory data // encoded per pluginManager's update ABI,
    ) public returns (Permission.ItemMultiTarget[] memory, bytes memory) {
        // check that plugin inherits from PluginUUPSUpgradeable
        if (updateInfo.plugin.supportsInterface(type(PluginUUPSUpgradeable).interfaceId)) {
            revert NotSupportsUpgradable();
        }

        // Implicitly confirms plugin managers are valid.
        // ensure repo for plugin manager exists
        if (!repoRegistry.entries(address(updateInfo.pluginManagerRepo))) {
            revert PluginRepoNotExists();
        }

        (uint16[3] memory oldVersion, , ) = updateInfo.pluginManagerRepo.getVersionByPluginManager(
            updateInfo.oldPluginManager
        );

        // Reverts if newPluginManager doesn't exist on the repo...
        updateInfo.pluginManagerRepo.getVersionByPluginManager(updateInfo.newPluginManager);

        // Check if helpers are correct...
        // Implicitly checks if plugin was installed in the first place.
        bytes32 oldHash = keccak256(
            abi.encode(dao, updateInfo.oldPluginManager, updateInfo.plugin)
        );

        if (helperHashes[oldHash] != keccak256(abi.encode(helpers))) {
            revert HelpersWrong();
        }

        delete helperHashes[oldHash];

        // update deploy..
        (
            address[] memory activeHelpers,
            bytes memory initData,
            Permission.ItemMultiTarget[] memory permissions
        ) = PluginManager(updateInfo.newPluginManager).update(
                dao,
                updateInfo.plugin,
                helpers,
                data,
                oldVersion
            );

        // add new helpers for the future update checks
        bytes32 newHash = keccak256(
            abi.encode(dao, updateInfo.newPluginManager, updateInfo.plugin)
        );
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
    ) public daoAuthorized(dao) {
        bytes32 hash = keccak256(abi.encode(dao, pluginManager, plugin));

        require(updatePermissionHashes[hash] == getPermissionsHash(permissions));

        upgradeProxy(plugin, PluginManager(pluginManager).getImplementationAddress(), initData);

        DAO(payable(dao)).bulkOnMultiTarget(permissions);

        emit PluginUpdated(dao, plugin); // TODO: some other parts might be needed..
    }

    function uninstallPlugin(
        address dao,
        address plugin,
        address[] calldata activeHelpers,
        PluginRepo pluginManagerRepo,
        address pluginManager
    ) public daoAuthorized(dao) {
        // Implicitly confirms plugin manager is valid valid.
        // ensure repo for plugin manager exists
        if (!repoRegistry.entries(address(pluginManagerRepo))) {
            revert PluginRepoNotExists();
        }

        // Reverts if pluginManager doesn't exist on the repo...
        pluginManagerRepo.getVersionByPluginManager(pluginManager);

        bytes32 hash = keccak256(abi.encode(dao, pluginManager, plugin));

        if (helperHashes[hash] != keccak256(abi.encode(activeHelpers))) {
            revert HelpersWrong();
        }

        delete helperHashes[hash];

        Permission.ItemMultiTarget[] memory permissions = PluginManager(pluginManager).uninstall(
            dao,
            plugin,
            activeHelpers
        );

        DAO(payable(dao)).bulkOnMultiTarget(permissions);

        emit PluginUninstalled(dao, plugin);
    }

    function getPermissionsHash(Permission.ItemMultiTarget[] memory permissions)
        private
        pure
        returns (bytes32)
    {
        bytes memory encoded;
        for (uint256 i = 0; i < permissions.length; i++) {
            Permission.ItemMultiTarget memory p = permissions[i];
            encoded = abi.encodePacked(
                encoded,
                p.operation,
                p.where,
                p.who,
                p.oracle,
                p.permissionId
            );
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
