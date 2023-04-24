// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {DAO, IDAO} from "../../../core/dao/DAO.sol";
import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
import {PluginUUPSUpgradeable} from "../../../core/plugin/PluginUUPSUpgradeable.sol";
import {IPlugin} from "../../../core/plugin/IPlugin.sol";

import {PluginRepoRegistry} from "../repo/PluginRepoRegistry.sol";
import {PluginRepo} from "../repo/PluginRepo.sol";

import {IPluginSetup} from "./IPluginSetup.sol";
import {PluginSetup} from "./PluginSetup.sol";
import {PluginSetupRef, hashHelpers, hashPermissions, _getPreparedSetupId, _getAppliedSetupId, _getPluginInstallationId, PreparationType} from "./PluginSetupProcessorHelpers.sol";

/// @title PluginSetupProcessor
/// @author Aragon Association - 2022-2023
/// @notice This contract processes the preparation and application of plugin setups (installation, update, uninstallation) on behalf of a requesting DAO.
/// @dev This contract is temporarily granted the `ROOT_PERMISSION_ID` permission on the applying DAO and therefore is highly security critical.
contract PluginSetupProcessor {
    using ERC165Checker for address;

    /// @notice The ID of the permission required to call the `applyInstallation` function.
    bytes32 public constant APPLY_INSTALLATION_PERMISSION_ID =
        keccak256("APPLY_INSTALLATION_PERMISSION");

    /// @notice The ID of the permission required to call the `applyUpdate` function.
    bytes32 public constant APPLY_UPDATE_PERMISSION_ID = keccak256("APPLY_UPDATE_PERMISSION");

    /// @notice The ID of the permission required to call the `applyUninstallation` function.
    bytes32 public constant APPLY_UNINSTALLATION_PERMISSION_ID =
        keccak256("APPLY_UNINSTALLATION_PERMISSION");

    /// @notice The hash obtained from the bytes-encoded empty array to be used for UI updates being required to submit an empty permission array.
    /// @dev The hash is computed via `keccak256(abi.encode([]))`.
    bytes32 private constant EMPTY_ARRAY_HASH =
        0x569e75fc77c1a856f6daaf9e69d8a9566ca34aa47f9133711ce065a571af0cfd;

    /// @notice The hash obtained from the bytes-encoded zero value.
    /// @dev The hash is computed via `keccak256(abi.encode(0))`.
    bytes32 private constant ZERO_BYTES_HASH =
        0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563;

    /// @notice A struct containing information related to plugin setups that have been applied.
    /// @param blockNumber The block number at which the `applyInstallation`, `applyUpdate` or `applyUninstallation` was executed.
    /// @param currentAppliedSetupId The current setup id that plugin holds. Needed to confirm that `prepareUpdate` or `prepareUninstallation` happens for the plugin's current/valid dependencies.
    /// @param preparedSetupIdToBlockNumber The mapping between prepared setup IDs and block numbers at which `prepareInstallation`, `prepareUpdate` or `prepareUninstallation` was executed.
    struct PluginState {
        uint256 blockNumber;
        bytes32 currentAppliedSetupId;
        mapping(bytes32 => uint256) preparedSetupIdToBlockNumber;
    }

    /// @notice A mapping between the plugin installation ID (obtained from the DAO and plugin address) and the plugin state information.
    /// @dev This variable is public on purpose to allow future versions to access and migrate the storage.
    mapping(bytes32 => PluginState) public states;

    /// @notice The struct containing the parameters for the `prepareInstallation` function.
    /// @param pluginSetupRef The reference to the plugin setup to be used for the installation.
    /// @param data The bytes-encoded data containing the input parameters for the installation preparation as specified in the corresponding ABI on the version's metadata.
    struct PrepareInstallationParams {
        PluginSetupRef pluginSetupRef;
        bytes data;
    }

    /// @notice The struct containing the parameters for the `applyInstallation` function.
    /// @param pluginSetupRef The reference to the plugin setup used for the installation.
    /// @param plugin The address of the plugin contract to be installed.
    /// @param permissions The array of multi-targeted permission operations to be applied by the `PluginSetupProcessor` to the DAO.
    /// @param helpersHash The hash of helpers that were deployed in `prepareInstallation`. This helps to derive the setup ID.
    struct ApplyInstallationParams {
        PluginSetupRef pluginSetupRef;
        address plugin;
        PermissionLib.MultiTargetPermission[] permissions;
        bytes32 helpersHash;
    }

    /// @notice The struct containing the parameters for the `prepareUpdate` function.
    /// @param currentVersionTag The tag of the current plugin version to update from.
    /// @param newVersionTag The tag of the new plugin version to update to.
    /// @param pluginSetupRepo The plugin setup repository address on which the plugin exists.
    /// @param setupPayload The payload containing the plugin and helper contract addresses deployed in a preparation step as well as optional data to be consumed by the plugin setup.
    ///  This includes the bytes-encoded data containing the input parameters for the update preparation as specified in the corresponding ABI on the version's metadata.
    struct PrepareUpdateParams {
        PluginRepo.Tag currentVersionTag;
        PluginRepo.Tag newVersionTag;
        PluginRepo pluginSetupRepo;
        IPluginSetup.SetupPayload setupPayload;
    }

    /// @notice The struct containing the parameters for the `applyUpdate` function.
    /// @param plugin The address of the plugin contract to be updated.
    /// @param pluginSetupRef The reference to the plugin setup used for the update.
    /// @param initData The encoded data (function selector and arguments) to be provided to `upgradeToAndCall`.
    /// @param permissions The array of multi-targeted permission operations to be applied by the `PluginSetupProcessor` to the DAO.
    /// @param helpersHash The hash of helpers that were deployed in `prepareUpdate`. This helps to derive the setup ID.
    struct ApplyUpdateParams {
        address plugin;
        PluginSetupRef pluginSetupRef;
        bytes initData;
        PermissionLib.MultiTargetPermission[] permissions;
        bytes32 helpersHash;
    }

    /// @notice The struct containing the parameters for the `prepareUninstallation` function.
    /// @param pluginSetupRef The reference to the plugin setup to be used for the uninstallation.
    /// @param setupPayload The payload containing the plugin and helper contract addresses deployed in a preparation step as well as optional data to be consumed by the plugin setup.
    ///  This includes the bytes-encoded data containing the input parameters for the uninstallation preparation as specified in the corresponding ABI on the version's metadata.
    struct PrepareUninstallationParams {
        PluginSetupRef pluginSetupRef;
        IPluginSetup.SetupPayload setupPayload;
    }

    /// @notice The struct containing the parameters for the `applyInstallation` function.
    /// @param plugin The address of the plugin contract to be uninstalled.
    /// @param pluginSetupRef The reference to the plugin setup used for the uninstallation.
    /// @param permissions The array of multi-targeted permission operations to be applied by the `PluginSetupProcess.
    struct ApplyUninstallationParams {
        address plugin;
        PluginSetupRef pluginSetupRef;
        PermissionLib.MultiTargetPermission[] permissions;
    }

    /// @notice The plugin repo registry listing the `PluginRepo` contracts versioning the `PluginSetup` contracts.
    PluginRepoRegistry public repoRegistry;

    /// @notice Thrown if a setup is unauthorized and cannot be applied because of a missing permission of the associated DAO.
    /// @param dao The address of the DAO to which the plugin belongs.
    /// @param caller The address (EOA or contract) that requested the application of a setup on the associated DAO.
    /// @param permissionId The permission identifier.
    /// @dev This is thrown if the `APPLY_INSTALLATION_PERMISSION_ID`, `APPLY_UPDATE_PERMISSION_ID`, or APPLY_UNINSTALLATION_PERMISSION_ID is missing.
    error SetupApplicationUnauthorized(address dao, address caller, bytes32 permissionId);

    /// @notice Thrown if a plugin is not upgradeable.
    /// @param plugin The address of the plugin contract.
    error PluginNonupgradeable(address plugin);

    /// @notice Thrown if the upgrade of an `UUPSUpgradeable` proxy contract (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)) failed.
    /// @param proxy The address of the proxy.
    /// @param implementation The address of the implementation contract.
    /// @param initData The initialization data to be passed to the upgradeable plugin contract via `upgradeToAndCall`.
    error PluginProxyUpgradeFailed(address proxy, address implementation, bytes initData);

    /// @notice Thrown if a contract does not support the `IPlugin` interface.
    /// @param plugin The address of the contract.
    error IPluginNotSupported(address plugin);

    /// @notice Thrown if a plugin repository does not exist on the plugin repo registry.
    error PluginRepoNonexistent();

    /// @notice Thrown if a plugin setup was already prepared inidcated by the prepared setup ID.
    /// @param preparedSetupId The prepared setup ID.
    error SetupAlreadyPrepared(bytes32 preparedSetupId);

    /// @notice Thrown if a prepared setup ID is not eligible to be applied. This can happen if another setup has been already applied or if the setup wasn't prepared in the first place.
    /// @param preparedSetupId The prepared setup ID.
    error SetupNotApplicable(bytes32 preparedSetupId);

    /// @notice Thrown if the update version is invalid.
    /// @param currentVersionTag The tag of the current version to update from.
    /// @param newVersionTag The tag of the new version to update to.
    error InvalidUpdateVersion(PluginRepo.Tag currentVersionTag, PluginRepo.Tag newVersionTag);

    /// @notice Thrown if plugin is already installed and one tries to prepare or apply install on it.
    error PluginAlreadyInstalled();

    /// @notice Thrown if the applied setup ID resulting from the supplied setup payload does not match with the current applied setup ID.
    /// @param currentAppliedSetupId The current applied setup ID with which the data in the supplied payload must match.
    /// @param appliedSetupId The applied setup ID obtained from the data in the supplied setup payload.
    error InvalidAppliedSetupId(bytes32 currentAppliedSetupId, bytes32 appliedSetupId);

    /// @notice Emitted with a prepared plugin installation to store data relevant for the application step.
    /// @param sender The sender that prepared the plugin installation.
    /// @param dao The address of the DAO to which the plugin belongs.
    /// @param preparedSetupId The prepared setup ID obtained from the supplied data.
    /// @param pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param versionTag The version tag of the plugin setup of the prepared installation.
    /// @param data The bytes-encoded data containing the input parameters for the preparation as specified in the corresponding ABI on the version's metadata.
    /// @param plugin The address of the plugin contract.
    /// @param preparedSetupData The deployed plugin's relevant data which consists of helpers and permissions.
    event InstallationPrepared(
        address indexed sender,
        address indexed dao,
        bytes32 preparedSetupId,
        PluginRepo indexed pluginSetupRepo,
        PluginRepo.Tag versionTag,
        bytes data,
        address plugin,
        IPluginSetup.PreparedSetupData preparedSetupData
    );

    /// @notice Emitted after a plugin installation was applied.
    /// @param dao The address of the DAO to which the plugin belongs.
    /// @param plugin The address of the plugin contract.
    /// @param preparedSetupId The prepared setup ID.
    /// @param appliedSetupId The applied setup ID.
    event InstallationApplied(
        address indexed dao,
        address indexed plugin,
        bytes32 preparedSetupId,
        bytes32 appliedSetupId
    );

    /// @notice Emitted with a prepared plugin update to store data relevant for the application step.
    /// @param sender The sender that prepared the plugin update.
    /// @param dao The address of the DAO to which the plugin belongs.
    /// @param preparedSetupId The prepared setup ID.
    /// @param pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param versionTag The version tag of the plugin setup of the prepared update.
    /// @param setupPayload The payload containing the plugin and helper contract addresses deployed in a preparation step as well as optional data to be consumed by the plugin setup.
    /// @param preparedSetupData The deployed plugin's relevant data which consists of helpers and permissions.
    /// @param initData The initialization data to be passed to the upgradeable plugin contract.
    event UpdatePrepared(
        address indexed sender,
        address indexed dao,
        bytes32 preparedSetupId,
        PluginRepo indexed pluginSetupRepo,
        PluginRepo.Tag versionTag,
        IPluginSetup.SetupPayload setupPayload,
        IPluginSetup.PreparedSetupData preparedSetupData,
        bytes initData
    );

    /// @notice Emitted after a plugin update was applied.
    /// @param dao The address of the DAO to which the plugin belongs.
    /// @param plugin The address of the plugin contract.
    /// @param preparedSetupId The prepared setup ID.
    /// @param appliedSetupId The applied setup ID.
    event UpdateApplied(
        address indexed dao,
        address indexed plugin,
        bytes32 preparedSetupId,
        bytes32 appliedSetupId
    );

    /// @notice Emitted with a prepared plugin uninstallation to store data relevant for the application step.
    /// @param sender The sender that prepared the plugin uninstallation.
    /// @param dao The address of the DAO to which the plugin belongs.
    /// @param preparedSetupId The prepared setup ID.
    /// @param pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param versionTag The version tag of the plugin to used for install preparation.
    /// @param setupPayload The payload containing the plugin and helper contract addresses deployed in a preparation step as well as optional data to be consumed by the plugin setup.
    /// @param permissions The list of multi-targeted permission operations to be applied to the installing DAO.
    event UninstallationPrepared(
        address indexed sender,
        address indexed dao,
        bytes32 preparedSetupId,
        PluginRepo indexed pluginSetupRepo,
        PluginRepo.Tag versionTag,
        IPluginSetup.SetupPayload setupPayload,
        PermissionLib.MultiTargetPermission[] permissions
    );

    /// @notice Emitted after a plugin installation was applied.
    /// @param dao The address of the DAO to which the plugin belongs.
    /// @param plugin The address of the plugin contract.
    /// @param preparedSetupId The prepared setup ID.
    event UninstallationApplied(
        address indexed dao,
        address indexed plugin,
        bytes32 preparedSetupId
    );

    /// @notice A modifier to check if a caller has the permission to apply a prepared setup.
    /// @param _dao The address of the DAO.
    /// @param _permissionId The permission identifier.
    modifier canApply(address _dao, bytes32 _permissionId) {
        _canApply(_dao, _permissionId);
        _;
    }

    /// @notice Constructs the plugin setup processor by setting the associated plugin repo registry.
    /// @param _repoRegistry The plugin repo registry contract.
    constructor(PluginRepoRegistry _repoRegistry) {
        repoRegistry = _repoRegistry;
    }

    /// @notice Prepares the installation of a plugin.
    /// @param _dao The address of the installing DAO.
    /// @param _params The struct containing the parameters for the `prepareInstallation` function.
    /// @return plugin The prepared plugin contract address.
    /// @return preparedSetupData The data struct containing the array of helper contracts and permissions that the setup has prepared.
    function prepareInstallation(
        address _dao,
        PrepareInstallationParams calldata _params
    ) external returns (address plugin, IPluginSetup.PreparedSetupData memory preparedSetupData) {
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
        (plugin, preparedSetupData) = PluginSetup(version.pluginSetup).prepareInstallation(
            _dao,
            _params.data
        );

        bytes32 pluginInstallationId = _getPluginInstallationId(_dao, plugin);

        bytes32 preparedSetupId = _getPreparedSetupId(
            _params.pluginSetupRef,
            hashPermissions(preparedSetupData.permissions),
            hashHelpers(preparedSetupData.helpers),
            bytes(""),
            PreparationType.Installation
        );

        PluginState storage pluginState = states[pluginInstallationId];

        // Check if this plugin is already installed.
        if (pluginState.currentAppliedSetupId != bytes32(0)) {
            revert PluginAlreadyInstalled();
        }

        // Check if this setup has already been prepared before and is pending.
        if (pluginState.blockNumber < pluginState.preparedSetupIdToBlockNumber[preparedSetupId]) {
            revert SetupAlreadyPrepared({preparedSetupId: preparedSetupId});
        }

        pluginState.preparedSetupIdToBlockNumber[preparedSetupId] = block.number;

        emit InstallationPrepared({
            sender: msg.sender,
            dao: _dao,
            preparedSetupId: preparedSetupId,
            pluginSetupRepo: pluginSetupRepo,
            versionTag: _params.pluginSetupRef.versionTag,
            data: _params.data,
            plugin: plugin,
            preparedSetupData: preparedSetupData
        });

        return (plugin, preparedSetupData);
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

        bytes32 preparedSetupId = _getPreparedSetupId(
            _params.pluginSetupRef,
            hashPermissions(_params.permissions),
            _params.helpersHash,
            bytes(""),
            PreparationType.Installation
        );

        // Check if this plugin is already installed.
        if (pluginState.currentAppliedSetupId != bytes32(0)) {
            revert PluginAlreadyInstalled();
        }

        validatePreparedSetupId(pluginInstallationId, preparedSetupId);

        bytes32 appliedSetupId = _getAppliedSetupId(_params.pluginSetupRef, _params.helpersHash);

        pluginState.currentAppliedSetupId = appliedSetupId;
        pluginState.blockNumber = block.number;

        // Process the permissions, which requires the `ROOT_PERMISSION_ID` from the installing DAO.
        if (_params.permissions.length > 0) {
            DAO(payable(_dao)).applyMultiTargetPermissions(_params.permissions);
        }

        emit InstallationApplied({
            dao: _dao,
            plugin: _params.plugin,
            preparedSetupId: preparedSetupId,
            appliedSetupId: appliedSetupId
        });
    }

    /// @notice Prepares the update of an UUPS upgradeable plugin.
    /// @param _dao The address of the DAO For which preparation of update happens.
    /// @param _params The struct containing the parameters for the `prepareUpdate` function.
    /// @return initData The initialization data to be passed to upgradeable contracts when the update is applied
    /// @return preparedSetupData The data struct containing the array of helper contracts and permissions that the setup has prepared.
    /// @dev The list of `_params.setupPayload.currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the update is prepared for.
    function prepareUpdate(
        address _dao,
        PrepareUpdateParams calldata _params
    )
        external
        returns (bytes memory initData, IPluginSetup.PreparedSetupData memory preparedSetupData)
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

        bytes32 appliedSetupId = _getAppliedSetupId(
            PluginSetupRef(_params.currentVersionTag, _params.pluginSetupRepo),
            currentHelpersHash
        );

        // The following check implicitly confirms that plugin is currently installed.
        // Otherwise, `currentAppliedSetupId` would not be set.
        if (pluginState.currentAppliedSetupId != appliedSetupId) {
            revert InvalidAppliedSetupId({
                currentAppliedSetupId: pluginState.currentAppliedSetupId,
                appliedSetupId: appliedSetupId
            });
        }

        PluginRepo.Version memory currentVersion = _params.pluginSetupRepo.getVersion(
            _params.currentVersionTag
        );

        PluginRepo.Version memory newVersion = _params.pluginSetupRepo.getVersion(
            _params.newVersionTag
        );

        bytes32 preparedSetupId;

        // If the current and new plugin setup are identical, this is an UI update.
        // In this case, the permission hash is set to the empty array hash and the `prepareUpdate` call is skipped to avoid side effects.
        if (currentVersion.pluginSetup == newVersion.pluginSetup) {
            preparedSetupId = _getPreparedSetupId(
                PluginSetupRef(_params.newVersionTag, _params.pluginSetupRepo),
                EMPTY_ARRAY_HASH,
                currentHelpersHash,
                bytes(""),
                PreparationType.Update
            );

            // Because UI updates do not change the plugin functionality, the array of helpers
            // associated with this plugin version `preparedSetupData.helpers` and being returned must
            // equal `_params.setupPayload.currentHelpers` returned by the previous setup step (installation or update )
            // that this update is transitioning from.
            preparedSetupData.helpers = _params.setupPayload.currentHelpers;
        } else {
            // Check that plugin is `PluginUUPSUpgradable`.
            if (!_params.setupPayload.plugin.supportsInterface(type(IPlugin).interfaceId)) {
                revert IPluginNotSupported({plugin: _params.setupPayload.plugin});
            }
            if (IPlugin(_params.setupPayload.plugin).pluginType() != IPlugin.PluginType.UUPS) {
                revert PluginNonupgradeable({plugin: _params.setupPayload.plugin});
            }

            // Prepare the update.
            (initData, preparedSetupData) = PluginSetup(newVersion.pluginSetup).prepareUpdate(
                _dao,
                _params.currentVersionTag.build,
                _params.setupPayload
            );

            preparedSetupId = _getPreparedSetupId(
                PluginSetupRef(_params.newVersionTag, _params.pluginSetupRepo),
                hashPermissions(preparedSetupData.permissions),
                hashHelpers(preparedSetupData.helpers),
                initData,
                PreparationType.Update
            );
        }

        // Check if this setup has already been prepared before and is pending.
        if (pluginState.blockNumber < pluginState.preparedSetupIdToBlockNumber[preparedSetupId]) {
            revert SetupAlreadyPrepared({preparedSetupId: preparedSetupId});
        }

        pluginState.preparedSetupIdToBlockNumber[preparedSetupId] = block.number;

        // Avoid stack too deep.
        emitPrepareUpdateEvent(_dao, preparedSetupId, _params, preparedSetupData, initData);

        return (initData, preparedSetupData);
    }

    /// @notice Applies the permissions of a prepared update of an UUPS upgradeable proxy contract to a DAO.
    /// @param _dao The address of the updating DAO.
    /// @param _params The struct containing the parameters for the `applyInstallation` function.
    function applyUpdate(
        address _dao,
        ApplyUpdateParams calldata _params
    ) external canApply(_dao, APPLY_UPDATE_PERMISSION_ID) {
        bytes32 pluginInstallationId = _getPluginInstallationId(_dao, _params.plugin);

        PluginState storage pluginState = states[pluginInstallationId];

        bytes32 preparedSetupId = _getPreparedSetupId(
            _params.pluginSetupRef,
            hashPermissions(_params.permissions),
            _params.helpersHash,
            _params.initData,
            PreparationType.Update
        );

        validatePreparedSetupId(pluginInstallationId, preparedSetupId);

        bytes32 appliedSetupId = _getAppliedSetupId(_params.pluginSetupRef, _params.helpersHash);

        pluginState.blockNumber = block.number;
        pluginState.currentAppliedSetupId = appliedSetupId;

        PluginRepo.Version memory version = _params.pluginSetupRef.pluginSetupRepo.getVersion(
            _params.pluginSetupRef.versionTag
        );

        address currentImplementation = PluginUUPSUpgradeable(_params.plugin).implementation();
        address newImplementation = PluginSetup(version.pluginSetup).implementation();

        if (currentImplementation != newImplementation) {
            _upgradeProxy(_params.plugin, newImplementation, _params.initData);
        }

        // Process the permissions, which requires the `ROOT_PERMISSION_ID` from the updating DAO.
        if (_params.permissions.length > 0) {
            DAO(payable(_dao)).applyMultiTargetPermissions(_params.permissions);
        }

        emit UpdateApplied({
            dao: _dao,
            plugin: _params.plugin,
            preparedSetupId: preparedSetupId,
            appliedSetupId: appliedSetupId
        });
    }

    /// @notice Prepares the uninstallation of a plugin.
    /// @param _dao The address of the installing DAO.
    /// @param _params The struct containing the parameters for the `prepareUninstallation` function.
    /// @return permissions The list of multi-targeted permission operations to be applied to the uninstalling DAO.
    /// @dev The list of `_params.setupPayload.currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the uninstallation was prepared for.
    function prepareUninstallation(
        address _dao,
        PrepareUninstallationParams calldata _params
    ) external returns (PermissionLib.MultiTargetPermission[] memory permissions) {
        bytes32 pluginInstallationId = _getPluginInstallationId(_dao, _params.setupPayload.plugin);

        PluginState storage pluginState = states[pluginInstallationId];

        bytes32 appliedSetupId = _getAppliedSetupId(
            _params.pluginSetupRef,
            hashHelpers(_params.setupPayload.currentHelpers)
        );

        if (pluginState.currentAppliedSetupId != appliedSetupId) {
            revert InvalidAppliedSetupId({
                currentAppliedSetupId: pluginState.currentAppliedSetupId,
                appliedSetupId: appliedSetupId
            });
        }

        PluginRepo.Version memory version = _params.pluginSetupRef.pluginSetupRepo.getVersion(
            _params.pluginSetupRef.versionTag
        );

        permissions = PluginSetup(version.pluginSetup).prepareUninstallation(
            _dao,
            _params.setupPayload
        );

        bytes32 preparedSetupId = _getPreparedSetupId(
            _params.pluginSetupRef,
            hashPermissions(permissions),
            ZERO_BYTES_HASH,
            bytes(""),
            PreparationType.Uninstallation
        );

        // Check if this setup has already been prepared before and is pending.
        if (pluginState.blockNumber < pluginState.preparedSetupIdToBlockNumber[preparedSetupId]) {
            revert SetupAlreadyPrepared({preparedSetupId: preparedSetupId});
        }

        pluginState.preparedSetupIdToBlockNumber[preparedSetupId] = block.number;

        emit UninstallationPrepared({
            sender: msg.sender,
            dao: _dao,
            preparedSetupId: preparedSetupId,
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
    /// @dev The list of `_params.setupPayload.currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the uninstallation was prepared for.
    function applyUninstallation(
        address _dao,
        ApplyUninstallationParams calldata _params
    ) external canApply(_dao, APPLY_UNINSTALLATION_PERMISSION_ID) {
        bytes32 pluginInstallationId = _getPluginInstallationId(_dao, _params.plugin);

        PluginState storage pluginState = states[pluginInstallationId];

        bytes32 preparedSetupId = _getPreparedSetupId(
            _params.pluginSetupRef,
            hashPermissions(_params.permissions),
            ZERO_BYTES_HASH,
            bytes(""),
            PreparationType.Uninstallation
        );

        validatePreparedSetupId(pluginInstallationId, preparedSetupId);

        // Since the plugin is uninstalled, only the current block number must be updated.
        pluginState.blockNumber = block.number;
        pluginState.currentAppliedSetupId = bytes32(0);

        // Process the permissions, which requires the `ROOT_PERMISSION_ID` from the uninstalling DAO.
        if (_params.permissions.length > 0) {
            DAO(payable(_dao)).applyMultiTargetPermissions(_params.permissions);
        }

        emit UninstallationApplied({
            dao: _dao,
            plugin: _params.plugin,
            preparedSetupId: preparedSetupId
        });
    }

    /// @notice Validates that a setup ID can be applied for `applyInstallation`, `applyUpdate`, or `applyUninstallation`.
    /// @param pluginInstallationId The plugin installation ID obtained from the hash of `abi.encode(daoAddress, pluginAddress)`.
    /// @param preparedSetupId The prepared setup ID to be validated.
    /// @dev If the block number stored in `states[pluginInstallationId].blockNumber` exceeds the one stored in `pluginState.preparedSetupIdToBlockNumber[preparedSetupId]`, the prepared setup with `preparedSetupId` is outdated and not applicable anymore.
    function validatePreparedSetupId(
        bytes32 pluginInstallationId,
        bytes32 preparedSetupId
    ) public view {
        PluginState storage pluginState = states[pluginInstallationId];
        if (pluginState.blockNumber >= pluginState.preparedSetupIdToBlockNumber[preparedSetupId]) {
            revert SetupNotApplicable({preparedSetupId: preparedSetupId});
        }
    }

    /// @notice Upgrades a UUPS upgradeable proxy contract (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @param _proxy The address of the proxy.
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

    /// @notice Checks if a caller has the permission to apply a setup.
    /// @param _dao The address of the applying DAO.
    /// @param _permissionId The permission ID.
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

    /// @notice A helper to emit the `UpdatePrepared` event from the supplied, structured data.
    /// @param _dao The address of the updating DAO.
    /// @param _preparedSetupId The prepared setup ID.
    /// @param _params The struct containing the parameters for the `prepareUpdate` function.
    /// @param _preparedSetupData The deployed plugin's relevant data which consists of helpers and permissions.
    /// @param _initData The initialization data to be passed to upgradeable contracts when the update is applied
    /// @dev This functions exists to avoid stack-too-deep errors.
    function emitPrepareUpdateEvent(
        address _dao,
        bytes32 _preparedSetupId,
        PrepareUpdateParams calldata _params,
        IPluginSetup.PreparedSetupData memory _preparedSetupData,
        bytes memory _initData
    ) private {
        emit UpdatePrepared({
            sender: msg.sender,
            dao: _dao,
            preparedSetupId: _preparedSetupId,
            pluginSetupRepo: _params.pluginSetupRepo,
            versionTag: _params.newVersionTag,
            setupPayload: _params.setupPayload,
            preparedSetupData: _preparedSetupData,
            initData: _initData
        });
    }
}
