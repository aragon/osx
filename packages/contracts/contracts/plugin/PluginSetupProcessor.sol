// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {PluginUUPSUpgradeable} from "../core/plugin/PluginUUPSUpgradeable.sol";
import {DaoAuthorizable} from "../core/component/DaoAuthorizable.sol";
import {DAO, IDAO} from "../core/DAO.sol";

import {PluginERC1967Proxy} from "../utils/PluginERC1967Proxy.sol";
import {PluginRepoRegistry} from "../registry/PluginRepoRegistry.sol";

import {Permission, PluginSetup} from "./PluginSetup.sol";
import {PluginRepo} from "./PluginRepo.sol";

/// @title PluginSetupProcessor
/// @author Aragon Association - 2022
/// @notice Plugin setup processor that has root permissions to setup plugin on the dao and apply permissions.
contract PluginSetupProcessor is DaoAuthorizable {
    using ERC165Checker for address;

    /// @notice The ID of the permission required to call the `applyInstallation` function.
    bytes32 public constant APPLY_INSTALLATION_PERMISSION_ID =
        keccak256("APPLY_INSTALLATION_PERMISSION");

    /// @notice The ID of the permission required to call the `applyUpdate` function.
    bytes32 public constant APPLY_UPDATE_PERMISSION_ID = keccak256("APPLY_UPDATE_PERMISSION");

    /// @notice The ID of the permission required to call the `applyUninstallation` function.
    bytes32 public constant APPLY_UNINSTALLATION_PERMISSION_ID =
        keccak256("APPLY_UNINSTALLATION_PERMISSION");

    /// @notice The ID of the permission required to call the `setRepoRegistry` function.
    bytes32 public constant SET_REPO_REGISTRY_PERMISSION_ID =
        keccak256("SET_REPO_REGISTRY_PERMISSION");

    struct PluginUpdateParams {
        address plugin;
        PluginRepo pluginSetupRepo; // where pluginsetup versions are handled.
        address oldPluginSetup;
        address newPluginSetup;
    }

    mapping(bytes32 => bool) private isInstallationApplied;
    mapping(bytes32 => bytes32) private installPermissionHashes;
    mapping(bytes32 => bytes32) private updatePermissionHashes;
    mapping(bytes32 => bytes32) private uninstallPermissionHashes;
    mapping(bytes32 => bytes32) private helpersHashes;

    PluginRepoRegistry public repoRegistry;

    error SetupNotAllowed(address caller, bytes32 permissionId);
    error PluginNonUpgradeable(address plugin);
    error BadPermissions(bytes32 stored, bytes32 passed);
    error PluginNotPrepared();
    error HelpersMismatch();
    error EmptyPluginRepo();
    error PluginAlreadyApplied(); // in case the PluginSetup is malicios and always/sometime returns the same address
    error UpdatePermissionsMismatch();
    error PluginNotApplied();
    error InstallationAlreadyPrepared();
    error UninstallationAlreadyPrepared();

    event InstallationPrepared(
        address indexed sender,
        address indexed dao,
        address indexed plugin,
        address pluginSetup,
        address[] helpers,
        Permission.ItemMultiTarget[] permissions,
        bytes data
    );

    // @notice Emitted after the plugin installation to track that a plugin was installed on a DAO.
    /// @param dao The dao address that plugin belongs to.
    /// @param plugin the plugin address.
    event InstallationApplied(address dao, address plugin);

    event UpdatePrepared(
        address indexed dao,
        address[] helpers,
        Permission.ItemMultiTarget[] permissions,
        bytes initData
    );
    event UpdateApplied(address indexed dao, address indexed plugin);

    event UninstallationPrepared(
        address indexed dao,
        address indexed plugin,
        address indexed pluginSetup,
        address[] activeHelpers,
        bytes data,
        Permission.ItemMultiTarget[] permissions
    );

    event UninstallationApplied(address indexed dao, address indexed plugin, address[] helpers);

    /// @dev Modifier used to check if the setup can be processed by the caller.
    /// @param _dao The address of the DAO.
    modifier canApply(address _dao, bytes32 _setupId) {
        _canApply(_dao, _setupId);
        _;
    }

    constructor(IDAO _dao, PluginRepoRegistry _repoRegistry) DaoAuthorizable(_dao) {
        repoRegistry = _repoRegistry;
    }

    function setRepoRegistry(PluginRepoRegistry _repoRegistry)
        external
        auth(SET_REPO_REGISTRY_PERMISSION_ID)
    {
        repoRegistry = _repoRegistry;
    }

    function prepareInstallation(
        address _dao,
        address _pluginSetup,
        PluginRepo _pluginSetupRepo,
        bytes memory _data // encoded per pluginSetup's prepareInstallation ABI
    ) external returns (Permission.ItemMultiTarget[] memory) {
        // ensure repo for plugin manager exists
        if (!repoRegistry.entries(address(_pluginSetupRepo))) {
            revert EmptyPluginRepo();
        }

        // Reverts if pluginSetup doesn't exist on the repo...
        _pluginSetupRepo.getVersionByPluginSetup(_pluginSetup);

        // prepareInstallation
        (
            address plugin,
            address[] memory helpers,
            Permission.ItemMultiTarget[] memory permissions
        ) = PluginSetup(_pluginSetup).prepareInstallation(_dao, _data);

        // Important safety measure to include dao + plugin manager in the encoding.
        bytes32 setupId = getSetupId(_dao, _pluginSetup, plugin);

        // Check if this plugin installation is already prepared
        if (installPermissionHashes[setupId] != bytes32(0)) {
            revert InstallationAlreadyPrepared();
        }

        installPermissionHashes[setupId] = getPermissionsHash(permissions);

        helpersHashes[setupId] = getHelpersHash(helpers);

        emit InstallationPrepared(
            msg.sender,
            _dao,
            plugin,
            _pluginSetup,
            helpers,
            permissions,
            _data
        );

        return permissions;
    }

    function applyInstallation(
        address _dao,
        address _pluginSetup,
        address _plugin,
        Permission.ItemMultiTarget[] calldata _permissions
    ) external canApply(_dao, APPLY_INSTALLATION_PERMISSION_ID) {
        bytes32 appliedId = getAppliedId(_dao, _plugin);

        if (isInstallationApplied[appliedId]) {
            revert PluginAlreadyApplied();
        }

        bytes32 setupId = getSetupId(_dao, _pluginSetup, _plugin);

        bytes32 storedPermissionHash = installPermissionHashes[setupId];

        // check if plugin was actually deployed..
        if (storedPermissionHash == bytes32(0)) {
            revert PluginNotPrepared();
        }

        bytes32 passedPermissionHash = getPermissionsHash(_permissions);

        // check that permissions weren't tempered.
        if (storedPermissionHash != passedPermissionHash) {
            revert BadPermissions({stored: storedPermissionHash, passed: passedPermissionHash});
        }

        // apply permissions on a dao..
        DAO(payable(_dao)).bulkOnMultiTarget(_permissions);

        // set is installation processed
        isInstallationApplied[appliedId] = true;

        // emit the event to connect plugin to the dao.
        emit InstallationApplied(_dao, _plugin);

        delete installPermissionHashes[setupId];
    }

    // TODO: might we need to check when `prepareUpdate` gets called, if plugin actually was installed ?
    // Though problematic, since this check only happens when plugin updates from 1.0 to 1.x
    // and checking it always would cost more... shall we still check it and how ?
    function prepareUpdate(
        address _dao,
        PluginUpdateParams calldata _updateParams,
        address[] calldata _helpers, // helpers that were deployed when installing/updating the plugin.
        bytes memory _data // encoded per pluginSetup's update ABI,
    ) external returns (Permission.ItemMultiTarget[] memory, bytes memory) {
        // check that plugin inherits from PluginUUPSUpgradeable
        if (!_updateParams.plugin.supportsInterface(type(PluginUUPSUpgradeable).interfaceId)) {
            revert PluginNonUpgradeable({plugin: _updateParams.plugin});
        }

        // Implicitly confirms plugin managers are valid.
        // ensure repo for plugin manager exists
        if (!repoRegistry.entries(address(_updateParams.pluginSetupRepo))) {
            revert EmptyPluginRepo();
        }

        // Check if plugin is applied
        bytes32 appliedId = getAppliedId(_dao, _updateParams.plugin);
        if (!isInstallationApplied[appliedId]) {
            revert PluginNotApplied();
        }

        (uint16[3] memory oldVersion, , ) = _updateParams.pluginSetupRepo.getVersionByPluginSetup(
            _updateParams.oldPluginSetup
        );

        // Reverts if newPluginSetup doesn't exist on the repo...
        _updateParams.pluginSetupRepo.getVersionByPluginSetup(_updateParams.newPluginSetup);

        // Check if helpers are correct...
        // Implicitly checks if plugin was installed in the first place.
        bytes32 oldSetupId = getSetupId(_dao, _updateParams.oldPluginSetup, _updateParams.plugin);

        if (helpersHashes[oldSetupId] != getHelpersHash(_helpers)) {
            revert HelpersMismatch();
        }

        delete helpersHashes[oldSetupId];

        // prepare update
        (
            address[] memory activeHelpers,
            bytes memory initData,
            Permission.ItemMultiTarget[] memory permissions
        ) = PluginSetup(_updateParams.newPluginSetup).prepareUpdate(
                _dao,
                _updateParams.plugin,
                _helpers,
                oldVersion,
                _data
            );

        // add new helpers for the future update checks
        bytes32 newSetupId = getSetupId(_dao, _updateParams.newPluginSetup, _updateParams.plugin);
        helpersHashes[newSetupId] = getHelpersHash(activeHelpers);

        // Set new update permission hashes.
        updatePermissionHashes[newSetupId] = getPermissionsHash(permissions);

        emit UpdatePrepared(_dao, activeHelpers, permissions, initData);

        return (permissions, initData);
    }

    function applyUpdate(
        address _dao,
        address _plugin, // proxy contract
        address _pluginSetup, // new plugin manager upgrade happens to.
        bytes memory _initData,
        Permission.ItemMultiTarget[] calldata _permissions
    ) external canApply(_dao, APPLY_UPDATE_PERMISSION_ID) {
        bytes32 setupId = getSetupId(_dao, _pluginSetup, _plugin);

        if (updatePermissionHashes[setupId] != getPermissionsHash(_permissions)) {
            revert UpdatePermissionsMismatch();
        }

        upgradeProxy(_plugin, PluginSetup(_pluginSetup).getImplementationAddress(), _initData);

        DAO(payable(_dao)).bulkOnMultiTarget(_permissions);

        delete updatePermissionHashes[setupId];

        emit UpdateApplied(_dao, _plugin); // TODO: some other parts might be needed..
    }

    function prepareUninstallation(
        address _dao,
        address _plugin,
        address _pluginSetup,
        PluginRepo _pluginSetupRepo,
        address[] calldata _activeHelpers,
        bytes calldata _data
    ) external returns (Permission.ItemMultiTarget[] memory permissions) {
        // ensure repo for plugin manager exists
        if (!repoRegistry.entries(address(_pluginSetupRepo))) {
            revert EmptyPluginRepo();
        }

        // Reverts if pluginSetup doesn't exist on the repo...
        _pluginSetupRepo.getVersionByPluginSetup(_pluginSetup);

        // check if plugin is applied.
        bytes32 appliedId = getAppliedId(_dao, _plugin);

        if (!isInstallationApplied[appliedId]) {
            revert PluginNotApplied();
        }

        permissions = PluginSetup(_pluginSetup).prepareUninstallation(
            _dao,
            _plugin,
            _activeHelpers,
            _data
        );

        bytes32 setupId = getSetupId(_dao, _pluginSetup, _plugin);

        // check helpers
        if (helpersHashes[setupId] != getHelpersHash(_activeHelpers)) {
            revert HelpersMismatch();
        }

        // Check if this plugin uninstallation is already prepared
        if (uninstallPermissionHashes[setupId] != bytes32(0)) {
            revert UninstallationAlreadyPrepared();
        }

        // set permission hashes.
        uninstallPermissionHashes[setupId] = getPermissionsHash(permissions);

        emit UninstallationPrepared(
            _dao,
            _plugin,
            _pluginSetup,
            _activeHelpers,
            _data,
            permissions
        );
    }

    function applyUninstallation(
        address _dao,
        address _plugin,
        address _pluginSetup,
        address[] calldata _activeHelpers,
        Permission.ItemMultiTarget[] calldata permissions
    ) external canApply(_dao, APPLY_UNINSTALLATION_PERMISSION_ID) {
        bytes32 setupId = getSetupId(_dao, _pluginSetup, _plugin);

        if (helpersHashes[setupId] != getHelpersHash(_activeHelpers)) {
            revert HelpersMismatch();
        }

        bytes32 storedPermissionHash = uninstallPermissionHashes[setupId];
        bytes32 passedPermissionHash = getPermissionsHash(permissions);

        // check that permissions weren't tempered.
        if (storedPermissionHash != passedPermissionHash) {
            revert BadPermissions({stored: storedPermissionHash, passed: passedPermissionHash});
        }

        DAO(payable(_dao)).bulkOnMultiTarget(permissions);

        delete helpersHashes[setupId];

        delete uninstallPermissionHashes[setupId];

        emit UninstallationApplied(_dao, _plugin, _activeHelpers);
    }

    function getAppliedId(address _dao, address _plugin) private pure returns (bytes32 appliedId) {
        appliedId = keccak256(abi.encode(_dao, _plugin));
    }

    function getSetupId(
        address _dao,
        address _pluginSetup,
        address _plugin
    ) private pure returns (bytes32 setupId) {
        setupId = keccak256(abi.encode(_dao, _pluginSetup, _plugin));
    }

    function getHelpersHash(address[] memory _helpers) private pure returns (bytes32 helpersHash) {
        helpersHash = keccak256(abi.encode(_helpers));
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
        if (initData.length > 0) {
            try
                PluginUUPSUpgradeable(proxy).upgradeToAndCall(implementation, initData)
            {} catch Error(string memory reason) {
                revert(reason);
            } catch (
                bytes memory /*lowLevelData*/
            ) {
                revert PluginNonUpgradeable({plugin: proxy});
            }
        } else {
            try PluginUUPSUpgradeable(proxy).upgradeTo(implementation) {} catch Error(
                string memory reason
            ) {
                revert(reason);
            } catch (
                bytes memory /*lowLevelData*/
            ) {
                revert PluginNonUpgradeable({plugin: proxy});
            }
        }
    }

    function _canApply(address _dao, bytes32 _permissionId) private view {
        if (
            msg.sender != _dao &&
            !DAO(payable(_dao)).hasPermission(address(this), msg.sender, _permissionId, bytes(""))
        ) {
            revert SetupNotAllowed({caller: msg.sender, permissionId: _permissionId});
        }
    }
}
