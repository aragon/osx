// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {PermissionLib} from "../core/permission/PermissionLib.sol";
import {PluginUUPSUpgradeable} from "../core/plugin/PluginUUPSUpgradeable.sol";
import {IPlugin} from "../core/plugin/IPlugin.sol";
import {IPluginSetup} from "./IPluginSetup.sol";
import {PluginSetup} from "./PluginSetup.sol";
import {DaoAuthorizable} from "../core/component/dao-authorizable/DaoAuthorizable.sol";
import {DAO, IDAO} from "../core/DAO.sol";
import {PluginRepoRegistry} from "../registry/PluginRepoRegistry.sol";
import {PluginRepo} from "./PluginRepo.sol";
import {PluginSetupRef, hashHelpers, hashPermissions, _getSetupId, _getPluginInstallationId, PreparationType} from "./psp/utils/Common.sol";

/// @title PluginSetupProcessor
/// @author Aragon Association - 2022
/// @notice This contract processes the preparation and application of plugin setups (installation, update, uninstallation) on behalf of a requesting DAO.
/// @dev This contract is temporarily granted the `ROOT_PERMISSION_ID` permission on the applying DAO and therefore is highly security critical.
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

    /// @notice Used when there's UI update only which gets stored for the setupId generation.
    /// @dev keccak256(abi.encode([]))
    bytes32 private constant EMPTY_ARRAY_HASH =
        0x569e75fc77c1a856f6daaf9e69d8a9566ca34aa47f9133711ce065a571af0cfd;

    /// @notice Used to show that the value is NULL
    /// @dev keccak256(abi.encode(bytes32(0))
    bytes32 private constant ZERO_BYTES_HASH =
        0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563;

    /// @notice The plugin state struct that contains the information related to the installed plugin.
    /// @param blockNumber The block number at which the `applyInstallation`, `applyUpdate` or `applyUninstallation` occured for the plugin.
    /// @param currentSetupId The current setup id that plugin holds. Needed to confirm that `prepareUpdate` or `prepareUninstallation` happens for the plugin's current/valid dependencies.
    /// @param setupIds The block number at which `prepareInstallation`, `prepareUpdate` or `prepareUninstallation` occured for the derived setupId.
    struct PluginState {
        uint256 blockNumber;
        bytes32 currentSetupId;
        mapping(bytes32 => uint256) setupIds;
    }

    /// @notice Stores plugin state information per pluginInstallationId
    /// @dev pluginInstallationId => abi.encode(pluginAddress, daoAddress)
    mapping(bytes32 => PluginState) private states;

    /// @notice The struct containing the parameters for the `prepareInstallation` function.
    /// @param pluginSetupRef Contains PluginSetupRepo(where to find the plugin) and version tag(which version to install).
    /// @param data The encoded data containing the input parameters for the installation as specified by the developer in the JSON.
    struct PrepareInstallationParams {
        PluginSetupRef pluginSetupRef;
        bytes data;
    }

    /// @notice The struct containing the parameters for the `applyInstallation` function.
    /// @param pluginSetupRef Contains PluginSetupRepo(where to find the plugin) and version tag(which version to install).
    /// @param plugin The address of the `Plugin` contract that will be installed on the DAO.
    /// @param permissions The array of multi-targeted permission operations to be applied by the `PluginSetupProcessor` to the DAO.
    /// @param helpersHash  The abi encoded hash of helpers that were deployed in `prepareInstallation`. This helps to derive the setupId.
    struct ApplyInstallationParams {
        PluginSetupRef pluginSetupRef;
        address plugin;
        PermissionLib.MultiTargetPermission[] permissions;
        bytes32 helpersHash;
    }

    /// @notice The struct containing the parameters for the `prepareUpdate` function.
    /// @param currentVersionTag Current version of the plugin from which it's updating.
    /// @param newVersionTag New version of the plugin to which it's updating.
    /// @param pluginSetupRepo The pluginSetupRepo address on which the plugin exists.
    /// @param setupPayload see IPluginSetup.SetupPayload
    struct PrepareUpdateParams {
        PluginRepo.Tag currentVersionTag;
        PluginRepo.Tag newVersionTag;
        PluginRepo pluginSetupRepo;
        IPluginSetup.SetupPayload setupPayload;
    }

    /// @notice The struct containing the parameters for the `applyUpdate` function.
    /// @param plugin The address of the plugin which is updating.
    /// @param pluginSetupRef The PluginSetupRepo address + new Version Tag for which the `prepareUpdate` was called.
    /// @param initData The encoded data(function selector + arguments) that will be called on the plugin's upgradeToAndCall call.
    /// @param permissions The array of multi-targeted permission operations to be applied by the `PluginSetupProcessor` to the DAO.
    /// @param helpersHash The abi encoded hash of helpers that were deployed in `prepareUpdate`. This helps to derive the setupId.
    struct ApplyUpdateParams {
        address plugin;
        PluginSetupRef pluginSetupRef;
        bytes initData;
        PermissionLib.MultiTargetPermission[] permissions;
        bytes32 helpersHash;
    }

    /// @notice The struct containing the parameters for the `prepareUninstallation` function.
    /// @param pluginSetupRef The PluginSetupRepo address + the current version of the plugin at which time it's getting uninstalled.
    /// @param setupPayload see IPluginSetup.SetupPayload
    struct PrepareUninstallationParams {
        PluginSetupRef pluginSetupRef;
        IPluginSetup.SetupPayload setupPayload;
    }

    /// @notice The struct containing the parameters for the `applyInstallation` function.
    /// @param plugin The address of the plugin which is uninstalling.
    /// @param pluginSetupRef The PluginSetupRepo address + the current version of the plugin at which time it's getting uninstalled.
    /// @param permissions The array of multi-targeted permission operations to be applied by the `PluginSetupProcess.
    struct ApplyUninstallationParams {
        address plugin;
        PluginSetupRef pluginSetupRef;
        PermissionLib.MultiTargetPermission[] permissions;
    }

    /// @notice The plugin repo registry listing the `PluginRepo` contracts versioning the `PluginSetup` contracts.
    PluginRepoRegistry public repoRegistry;

    /// @notice Thrown if a setup is unauthorized for the associated DAO.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param caller The address (EOA or contract) that requested the application of a setup on the associated DAO.
    /// @param permissionId The permission identifier.
    error SetupApplicationUnauthorized(address dao, address caller, bytes32 permissionId);

    /// @notice Thrown if a plugin is not upgradeable.
    /// @param plugin The address of the plugin contract.
    error PluginNonupgradeable(address plugin);

    /// @notice Thrown if the upgrade of a plugin proxy failed.
    /// @param proxy The address of the UUPSUpgradeable proxy.
    /// @param implementation The address of the implementation contract.
    /// @param initData The initialization data to be passed to the upgradeable plugin contract via `upgradeToAndCall`.
    error PluginProxyUpgradeFailed(address proxy, address implementation, bytes initData);

    /// @notice Thrown if a contract does not support the `IPlugin` interface.
    /// @param plugin The address of the contract.
    error IPluginNotSupported(address plugin);

    /// @notice Thrown if two permissions hashes obtained via [`getPermissionsHash`](#private-function-`getPermissionsHash`) don't match.
    error PermissionsHashMismatch();

    /// @notice Thrown if two helpers hashes obtained via  [`getHelpersHash`](#private-function-`getHelpersHash`) don't match.
    error HelpersHashMismatch();

    /// @notice Thrown if a plugin repository does not exist on the plugin repo registry.
    error PluginRepoNonexistent();

    /// @notice Thrown if a plugin setup was already prepared.
    /// @param setupId Already prepared setupId.
    error SetupAlreadyPrepared(bytes32 setupId);

    /// @notice Thrown when the setupId is no longer eligible for the `apply`. This could happen if another prepared setupId was chosen for the apply or setupId wasn't prepared in the first place.
    /// @param setupId The prepared setup id from the `prepareInstallation`, `prepareUpdate` or `prepareUninstallation`.
    error SetupNotApplicable(bytes32 setupId);

    /// @notice Thrown when the update version is invalid.
    /// @param currentVersionTag The current version of the plugin from which it updates.
    /// @param newVersionTag The new version of the plugin to which it updates.
    error InvalidUpdateVersion(PluginRepo.Tag currentVersionTag, PluginRepo.Tag newVersionTag);

    /// @notice Thrown when plugin is already installed and one tries to prepare or apply install on it.
    error PluginAlreadyInstalled();

    /// @notice Thrown when user's arguments for the apply function don't match the currently applied setupId.
    /// @param currentSetupId The current setup id to which user's preparation setup should match to.
    /// @param setupId The user's preparation setup id.
    error InvalidSetupId(bytes32 currentSetupId, bytes32 setupId);

    /// @notice Emitted with a prepared plugin installation to store data relevant for the application step.
    /// @param sender The sender that prepared the plugin installation.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param setupId TOD:GIORGI: The setup Id hash of the plugin's dependencies.
    /// @param pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param versionTag The version tag of the plugin to used for install preparation.
    /// @param data The `bytes` encoded data containing the input parameters for the installation as specified in the `prepareInstallationDataABI()` function in the `pluginSetup` setup contract.
    /// @param plugin The address of the plugin contract.
    /// @param preparedDependency TOD:GIORGI
    event InstallationPrepared(
        address indexed sender,
        address indexed dao,
        bytes32 setupId,
        PluginRepo indexed pluginSetupRepo,
        PluginRepo.Tag versionTag,
        bytes data,
        address plugin,
        IPluginSetup.PreparedDependency preparedDependency
    );

    /// @notice Emitted after a plugin installation was applied.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param plugin The address of the plugin contract.
    /// @param setupId TOD:GIORGI: The setup Id hash of the plugin's dependencies.
    event InstallationApplied(address indexed dao, address indexed plugin, bytes32 setupId);

    /// @notice Emitted with a prepared plugin update to store data relevant for the application step.
    /// @param sender The sender that prepared the plugin installation.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param versionTag The version tag of the plugin to used for install preparation.
    /// @param setupPayload TOD:GIORGI
    /// @param preparedDependency TOD:GIORGI
    /// @param initData The initialization data to be passed to the upgradeable plugin contract.
    event UpdatePrepared(
        address indexed sender,
        address indexed dao,
        bytes32 setupId,
        PluginRepo indexed pluginSetupRepo,
        PluginRepo.Tag versionTag,
        IPluginSetup.SetupPayload setupPayload,
        IPluginSetup.PreparedDependency preparedDependency,
        bytes initData
    );

    /// @notice Emitted after a plugin update was applied.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param plugin The address of the plugin contract.
    /// @param setupId TOD:GIORGI: The setup Id hash of the plugin's dependencies.
    event UpdateApplied(address indexed dao, address indexed plugin, bytes32 setupId);

    /// @notice Emitted with a prepared plugin uninstallation to store data relevant for the application step.
    /// @param sender The sender that prepared the plugin uninstallation.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param setupId TOD:GIORGI: The setup Id hash of the plugin's dependencies.
    /// @param pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param versionTag The version tag of the plugin to used for install preparation.
    /// @param setupPayload TOD:GIORGI
    /// @param permissions The list of multi-targeted permission operations to be applied to the installing DAO.
    event UninstallationPrepared(
        address indexed sender,
        address indexed dao,
        bytes32 setupId,
        PluginRepo indexed pluginSetupRepo,
        PluginRepo.Tag versionTag,
        IPluginSetup.SetupPayload setupPayload,
        PermissionLib.MultiTargetPermission[] permissions
    );

    /// @notice Emitted after a plugin installation was applied.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param plugin The address of the plugin contract.
    /// @param setupId TOD:GIORGI: The setup Id hash of the plugin's dependencies.
    event UninstallationApplied(address indexed dao, address indexed plugin, bytes32 setupId);

    /// @notice A modifier to check if a caller has the permission to apply a prepared setup.
    /// @param _dao The address of the DAO.
    /// @param _permissionId The permission identifier.
    modifier canApply(address _dao, bytes32 _permissionId) {
        _canApply(_dao, _permissionId);
        _;
    }

    /// @notice Constructs the plugin setup processor by setting the managing DAO and the associated plugin repo registry.
    /// @param _managingDao The DAO managing the plugin setup processors permissions.
    /// @param _repoRegistry The plugin repo registry contract.
    constructor(IDAO _managingDao, PluginRepoRegistry _repoRegistry) DaoAuthorizable(_managingDao) {
        repoRegistry = _repoRegistry;
    }

    /// @notice Prepares the installation of a plugin.
    /// @param _dao The address of the installing DAO.
    /// @param _params The struct containing the parameters for the `prepareInstallation` function.
    /// @return plugin The prepared plugin contract address.
    /// @return preparedDependency TOD:GIORGI
    function prepareInstallation(
        address _dao,
        PrepareInstallationParams calldata _params
    ) external returns (address plugin, IPluginSetup.PreparedDependency memory preparedDependency) {
        PluginRepo pluginSetupRepo = _params.pluginSetupRef.pluginSetupRepo;

        // Check that the plugin repository exists on the plugin repo registry.
        if (!repoRegistry.entries(address(pluginSetupRepo))) {
            revert PluginRepoNonexistent();
        }

        // reverts if not found
        PluginRepo.Version memory version = pluginSetupRepo.getVersion(
            _params.pluginSetupRef.versionTag
        );

        // Prepare the installation
        (plugin, preparedDependency) = PluginSetup(version.pluginSetup).prepareInstallation(
            _dao,
            _params.data
        );

        bytes32 pluginInstallationId = _getPluginInstallationId(_dao, plugin);

        bytes32 setupId = _getSetupId(
            _params.pluginSetupRef,
            hashPermissions(preparedDependency.permissions),
            hashHelpers(preparedDependency.helpers),
            bytes(""),
            PreparationType.Install
        );

        PluginState storage pluginState = states[pluginInstallationId];

        // Allow calling `prepareInstallation` only when
        // plugin was uninstalled or never been installed before.
        if (pluginState.currentSetupId != bytes32(0)) {
            revert PluginAlreadyInstalled();
        }

        // Only allow to prepare if setupId has not been prepared before.
        // NOTE that if plugin was uninstalled, the same setupId can still
        // be prepared as blockNumber would end up being higher than setupId's blockNumber.
        // This case applies to stateful plugins which means pluginSetup always returns the same plugin address.
        // Though, the same setupId still would need to be prepared (see validateSetupId in `applyInstallation`) first
        // to make sure prepare event is thrown again.
        if (pluginState.blockNumber < pluginState.setupIds[setupId]) {
            revert SetupAlreadyPrepared(setupId);
        }

        pluginState.setupIds[setupId] = block.number;

        emit InstallationPrepared({
            sender: msg.sender,
            dao: _dao,
            setupId: setupId,
            pluginSetupRepo: pluginSetupRepo,
            versionTag: _params.pluginSetupRef.versionTag,
            data: _params.data,
            plugin: plugin,
            preparedDependency: preparedDependency
        });

        return (plugin, preparedDependency);
    }

    /// @notice Applies the permissions of a prepared installation to a DAO.
    /// @param _dao The address of the installing DAO.
    /// @param _params The struct containing the parameters for the `applyInstallation` function.
    function applyInstallation(
        address _dao,
        ApplyInstallationParams calldata _params
    ) external canApply(_dao, APPLY_INSTALLATION_PERMISSION_ID) {
        bytes32 pluginInstallationId = _getPluginInstallationId(_dao, _params.plugin);

        PluginState storage pluginState = states[pluginInstallationId];

        bytes32 setupId = _getSetupId(
            _params.pluginSetupRef,
            hashPermissions(_params.permissions),
            _params.helpersHash,
            bytes(""),
            PreparationType.Install
        );

        // Allow calling `applyInstallation` only when
        // plugin was uninstalled or never been installed before.
        if (pluginState.currentSetupId != bytes32(0)) {
            revert PluginAlreadyInstalled();
        }

        validateSetupId(pluginInstallationId, setupId);

        bytes32 newSetupId = _getSetupId(
            _params.pluginSetupRef,
            ZERO_BYTES_HASH,
            _params.helpersHash,
            bytes(""),
            PreparationType.None
        );

        pluginState.currentSetupId = newSetupId;
        pluginState.blockNumber = block.number;

        // Process the permissions
        // PSP on the dao should have ROOT permission
        if (_params.permissions.length > 0) {
            DAO(payable(_dao)).applyMultiTargetPermissions(_params.permissions);
        }

        emit InstallationApplied({dao: _dao, plugin: _params.plugin, setupId: newSetupId});
    }

    /// @notice Prepares the update of an UUPS upgradeable plugin.
    /// @param _dao The address of the DAO For which preparation of update happens.
    /// @param _params The struct containing the parameters for the `prepareUpdate` function.
    /// @return initData The initialization data to be passed to upgradeable contracts when the update is applied
    /// @return preparedDependency TOD:GIORGI
    /// @dev The list of `_currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the update is prepared for
    function prepareUpdate(
        address _dao,
        PrepareUpdateParams calldata _params
    )
        external
        returns (bytes memory initData, IPluginSetup.PreparedDependency memory preparedDependency)
    {
        if (
            _params.currentVersionTag.release != _params.newVersionTag.release ||
            _params.currentVersionTag.build >= _params.newVersionTag.build
        ) {
            revert InvalidUpdateVersion({
                currentVersionTag: _params.currentVersionTag,
                newVersionTag: _params.newVersionTag
            });
        }

        bytes32 pluginInstallationId = _getPluginInstallationId(_dao, _params.setupPayload.plugin);

        PluginState storage pluginState = states[pluginInstallationId];

        bytes32 currentHelpersHash = hashHelpers(_params.setupPayload.currentHelpers);

        bytes32 setupId = _getSetupId(
            PluginSetupRef(_params.currentVersionTag, _params.pluginSetupRepo),
            ZERO_BYTES_HASH,
            currentHelpersHash,
            bytes(""),
            PreparationType.None
        );

        // The following check implicitly confirms that plugin
        // is currently installed. Otherwise, currentSetupId wouldn't be set.
        if (pluginState.currentSetupId != setupId) {
            revert InvalidSetupId({currentSetupId: pluginState.currentSetupId, setupId: setupId});
        }

        PluginRepo.Version memory currentVersion = _params.pluginSetupRepo.getVersion(
            _params.currentVersionTag
        );

        PluginRepo.Version memory newVersion = _params.pluginSetupRepo.getVersion(
            _params.newVersionTag
        );

        bytes32 newSetupId;

        // If the current version's pluginSetup is equal to
        // new version's plugin setup, it means plugin or plugin setup
        // have not changed and only UI change is detected. In such a case,
        // We don't call plugin setup to not cause any side effects.
        if (currentVersion.pluginSetup == newVersion.pluginSetup) {
            newSetupId = _getSetupId(
                PluginSetupRef(_params.newVersionTag, _params.pluginSetupRepo),
                EMPTY_ARRAY_HASH,
                currentHelpersHash,
                bytes(""),
                PreparationType.Update
            );
        } else {
            // Check that plugin is `PluginUUPSUpgradable`.
            if (!_params.setupPayload.plugin.supportsInterface(type(IPlugin).interfaceId)) {
                revert IPluginNotSupported({plugin: _params.setupPayload.plugin});
            }
            if (IPlugin(_params.setupPayload.plugin).pluginType() != IPlugin.PluginType.UUPS) {
                revert PluginNonupgradeable({plugin: _params.setupPayload.plugin});
            }

            // Prepare the update.
            (initData, preparedDependency) = PluginSetup(newVersion.pluginSetup).prepareUpdate(
                _dao,
                _params.currentVersionTag.build,
                _params.setupPayload
            );

            newSetupId = _getSetupId(
                PluginSetupRef(_params.newVersionTag, _params.pluginSetupRepo),
                hashPermissions(preparedDependency.permissions),
                hashHelpers(preparedDependency.helpers),
                initData,
                PreparationType.Update
            );
        }

        // Only allow to prepare if setupId has not been prepared before.
        // Note that the following check ensures that the same setupId can be prepared
        // once again if the plugin was uninstalled and then installed.
        if (pluginState.blockNumber < pluginState.setupIds[newSetupId]) {
            revert SetupAlreadyPrepared(newSetupId);
        }

        pluginState.setupIds[newSetupId] = block.number;

        // Avoid stack too deep.
        emitPrepareUpdateEvent(_dao, newSetupId, _params, preparedDependency, initData);

        return (initData, preparedDependency);
    }

    /// @notice Applies the permissions of a prepared update of an UUPS upgradeable contract to a DAO.
    /// @param _dao The address of the updating DAO.
    /// @param _params The struct containing the parameters for the `applyInstallation` function.
    function applyUpdate(
        address _dao,
        ApplyUpdateParams calldata _params
    ) external canApply(_dao, APPLY_UPDATE_PERMISSION_ID) {
        bytes32 pluginInstallationId = _getPluginInstallationId(_dao, _params.plugin);

        PluginState storage pluginState = states[pluginInstallationId];

        bytes32 setupId = _getSetupId(
            _params.pluginSetupRef,
            hashPermissions(_params.permissions),
            _params.helpersHash,
            _params.initData,
            PreparationType.Update
        );

        validateSetupId(pluginInstallationId, setupId);

        // Once the applyUpdate is called and arguments are confirmed(including initData)
        // we update the setupId with the new versionTag, the current helpers. All other
        // data can be put with bytes(0) as they don't need to be confirmed in the later
        // prepareUpdate/prepareUninstallation.
        bytes32 newSetupId = _getSetupId(
            _params.pluginSetupRef,
            ZERO_BYTES_HASH,
            _params.helpersHash,
            bytes(""),
            PreparationType.None
        );

        pluginState.blockNumber = block.number;
        pluginState.currentSetupId = newSetupId;

        PluginRepo.Version memory version = _params.pluginSetupRef.pluginSetupRepo.getVersion(
            _params.pluginSetupRef.versionTag
        );

        address currentImplementation = PluginUUPSUpgradeable(_params.plugin)
            .getImplementationAddress();
        address newImplementation = PluginSetup(version.pluginSetup).getImplementationAddress();

        if (currentImplementation != newImplementation) {
            _upgradeProxy(_params.plugin, newImplementation, _params.initData);
        }

        // Process the permissions
        // PSP on the dao should have ROOT permission
        if (_params.permissions.length > 0) {
            DAO(payable(_dao)).applyMultiTargetPermissions(_params.permissions);
        }

        emit UpdateApplied({dao: _dao, plugin: _params.plugin, setupId: setupId});
    }

    /// @notice Prepares the uninstallation of a plugin.
    /// @param _dao The address of the installing DAO.
    /// @param _params The struct containing the parameters for the `prepareUninstallation` function.
    /// @return permissions The list of multi-targeted permission operations to be applied to the uninstalling DAO.
    /// @dev The list of `_currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the uninstallation was prepared for
    function prepareUninstallation(
        address _dao,
        PrepareUninstallationParams calldata _params
    ) external returns (PermissionLib.MultiTargetPermission[] memory permissions) {
        bytes32 pluginInstallationId = _getPluginInstallationId(_dao, _params.setupPayload.plugin);

        PluginState storage pluginState = states[pluginInstallationId];

        bytes32 setupId = _getSetupId(
            _params.pluginSetupRef,
            ZERO_BYTES_HASH,
            hashHelpers(_params.setupPayload.currentHelpers),
            bytes(""),
            PreparationType.None
        );

        if (pluginState.currentSetupId != setupId) {
            revert InvalidSetupId({currentSetupId: pluginState.currentSetupId, setupId: setupId});
        }

        PluginRepo.Version memory version = _params.pluginSetupRef.pluginSetupRepo.getVersion(
            _params.pluginSetupRef.versionTag
        );

        permissions = PluginSetup(version.pluginSetup).prepareUninstallation(
            _dao,
            _params.setupPayload
        );

        bytes32 newSetupId = _getSetupId(
            _params.pluginSetupRef,
            hashPermissions(permissions),
            ZERO_BYTES_HASH,
            bytes(""),
            PreparationType.Uninstall
        );

        // Only allow to prepare if setupId has not been prepared before.
        // Note that the following check ensures that the same setupId can be prepared
        // once again if the plugin was uninstalled and then installed/updated.
        if (pluginState.blockNumber < pluginState.setupIds[newSetupId]) {
            revert SetupAlreadyPrepared(newSetupId);
        }

        pluginState.setupIds[newSetupId] = block.number;

        emit UninstallationPrepared({
            sender: msg.sender,
            dao: _dao,
            setupId: newSetupId,
            pluginSetupRepo: _params.pluginSetupRef.pluginSetupRepo,
            versionTag: _params.pluginSetupRef.versionTag,
            setupPayload: _params.setupPayload,
            permissions: permissions
        });
    }

    /// @notice Applies the permissions of a prepared uninstallation to a DAO.
    /// @param _dao The address of the DAO.
    /// @param _dao The address of the installing DAO.
    /// @param _params The struct containing the parameters for the `applyUninstallation` function.
    /// @dev The list of `_currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the uninstallation was prepared for.
    function applyUninstallation(
        address _dao,
        ApplyUninstallationParams calldata _params
    ) external canApply(_dao, APPLY_UNINSTALLATION_PERMISSION_ID) {
        bytes32 pluginInstallationId = _getPluginInstallationId(_dao, _params.plugin);

        PluginState storage pluginState = states[pluginInstallationId];

        bytes32 setupId = _getSetupId(
            _params.pluginSetupRef,
            hashPermissions(_params.permissions),
            ZERO_BYTES_HASH,
            bytes(""),
            PreparationType.Uninstall
        );

        validateSetupId(pluginInstallationId, setupId);

        pluginState.blockNumber = block.number;
        pluginState.currentSetupId = bytes32(0);

        // Process the permissions
        // PSP on the dao should have ROOT permission
        if (_params.permissions.length > 0) {
            DAO(payable(_dao)).applyMultiTargetPermissions(_params.permissions);
        }

        emit UninstallationApplied({dao: _dao, plugin: _params.plugin, setupId: setupId});
    }

    /// @notice Checks if the setupId for the plugin is valid to be applied for `applyUpdate`, `applyInstallation` or `applyUninstallation`.
    /// @param pluginInstallationId the hash of `abi.encode(daoAddress, pluginAddress)`-
    /// @param setupId The setupId to check for validity to be used in `applyType` functions.
    function validateSetupId(bytes32 pluginInstallationId, bytes32 setupId) public view {
        PluginState storage pluginState = states[pluginInstallationId];
        // If the plugin block number exceeds the setupId preparation block number,
        // This means applyUpdate was already called on another setupId
        // and all the rest setupIds should become idle or setupId is not prepared before.
        if (pluginState.blockNumber >= pluginState.setupIds[setupId]) {
            revert SetupNotApplicable(setupId);
        }
    }

    /// @notice Upgrades an UUPSUpgradeable proxy contract (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @param _proxy The address of the UUPSUpgradeable proxy.
    /// @param _implementation The address of the implementation contract.
    /// @param _initData The initialization data to be passed to the upgradeable plugin contract via `upgradeToAndCall`.
    function _upgradeProxy(
        address _proxy,
        address _implementation,
        bytes memory _initData
    ) private {
        if (_initData.length > 0) {
            try
                PluginUUPSUpgradeable(_proxy).upgradeToAndCall(_implementation, _initData)
            {} catch Error(string memory reason) {
                revert(reason);
            } catch (bytes memory /*lowLevelData*/) {
                revert PluginProxyUpgradeFailed({
                    proxy: _proxy,
                    implementation: _implementation,
                    initData: _initData
                });
            }
        } else {
            try PluginUUPSUpgradeable(_proxy).upgradeTo(_implementation) {} catch Error(
                string memory reason
            ) {
                revert(reason);
            } catch (bytes memory /*lowLevelData*/) {
                revert PluginProxyUpgradeFailed({
                    proxy: _proxy,
                    implementation: _implementation,
                    initData: _initData
                });
            }
        }
    }

    /// @notice Internal function to check if a caller has the permission to apply a prepared setup.
    /// @param _dao The address of the DAO conducting the setup.
    /// @param _permissionId The permission identifier.
    function _canApply(address _dao, bytes32 _permissionId) private view {
        if (
            msg.sender != _dao &&
            !DAO(payable(_dao)).hasPermission(address(this), msg.sender, _permissionId, bytes(""))
        ) {
            revert SetupApplicationUnauthorized({
                dao: _dao,
                caller: msg.sender,
                permissionId: _permissionId
            });
        }
    }

    /// @dev to avoid stack too deep, the function makes sure it uses stack values at a correct level.
    /// @param _dao The address of the DAO For which preparation of update happens.
    /// @param _setupId The setupId
    /// @param _params The struct containing the parameters for the `prepareUpdate` function.
    /// @param _preparedDependency TOD:GIORGI
    /// @param _initData The initialization data to be passed to upgradeable contracts when the update is applied
    function emitPrepareUpdateEvent(
        address _dao,
        bytes32 _setupId,
        PrepareUpdateParams calldata _params,
        IPluginSetup.PreparedDependency memory _preparedDependency,
        bytes memory _initData
    ) private {
        emit UpdatePrepared({
            sender: msg.sender,
            dao: _dao,
            setupId: _setupId,
            pluginSetupRepo: _params.pluginSetupRepo,
            versionTag: _params.newVersionTag,
            setupPayload: _params.setupPayload,
            preparedDependency: _preparedDependency,
            initData: _initData
        });
    }
}
