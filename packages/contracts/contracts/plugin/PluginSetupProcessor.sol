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
/// @author Aragon Association - 2022-2023
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

    /// @notice The hash obtained from the bytes-encoded empty array to be used for UI updates being required to submit an empty permission array.
    /// @dev The hash is computed via `keccak256(abi.encode([]))`.
    bytes32 private constant EMPTY_ARRAY_HASH =
        0x569e75fc77c1a856f6daaf9e69d8a9566ca34aa47f9133711ce065a571af0cfd;

    /// @notice The hash obtained from the bytes-encoded zero value.
    /// @dev The hash is computed via `keccak256(abi.encode(0))`.
    bytes32 private constant ZERO_BYTES_HASH =
        0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563;

    /// @notice A struct containing the information related to an installed plugin.
    /// @param blockNumber The block number at which the `applyInstallation`, `applyUpdate` or `applyUninstallation` was executed.
    /// @param currentSetupId The current setup ID of the plugin to validate that the `prepareUpdate` or `prepareUninstallation` have happend for the plugin's current/valid dependencies.
    /// @param setupIdToBlockNumber The mapping between setup IDs and block numbers at which `prepareInstallation`, `prepareUpdate` or `prepareUninstallation` was executed.
    struct PluginState {
        uint256 blockNumber;
        bytes32 currentSetupId;
        mapping(bytes32 => uint256) setupIdToBlockNumber;
    }

    /// @notice A mapping between the plugin installation ID (obtained from the DAO and plugin address) and the plugin state information.
    /// @dev pluginInstallationId => abi.encode(pluginAddress, daoAddress)
    mapping(bytes32 => PluginState) private states;

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
    /// @param setupPayload The payload containing the existing contracts as well as optional data to be consumed by the plugin setup.
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
    /// @param initData The encoded data (function selector and arguments) to be providied to `upgradeToAndCall`.
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
    /// @param setupPayload The payload containing the existing contracts as well as optional data to be consumed by the plugin setup.
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

    /// @notice Thrown if a setup is unauthorized for the associated DAO.
    /// @param dao The address of the DAO to which the plugin belongs.
    /// @param caller The address (EOA or contract) that requested the application of a setup on the associated DAO.
    /// @param permissionId The permission identifier.
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

    /// @notice Thrown if a plugin setup was already prepared.
    /// @param setupId The setup ID being already prepared.
    error SetupAlreadyPrepared(bytes32 setupId);

    /// @notice Thrown if a setup ID is not eligible to be applied. This can happen if another setup has been already applied or if the setup wasn't prepared in the first place.
    /// @param setupId The setup ID of a `prepareInstallation`, `prepareUpdate` or `prepareUninstallation` call.
    error SetupNotApplicable(bytes32 setupId);

    /// @notice Thrown if the update version is invalid.
    /// @param currentVersionTag The tag of the current version to update from.
    /// @param newVersionTag The tag of the new version to update to.
    error InvalidUpdateVersion(PluginRepo.Tag currentVersionTag, PluginRepo.Tag newVersionTag);

    /// @notice Thrown if plugin is already installed and one tries to prepare or apply install on it.
    error PluginAlreadyInstalled();

    /// @notice Thrown if the setup ID resulting from the supplied setup payload does not match with the current setup ID.
    /// @param currentSetupId The current setup ID with which the data in the supplied payload must match.
    /// @param setupId The setup ID obtained from the data in the supplied setup payload.
    error InvalidSetupId(bytes32 currentSetupId, bytes32 setupId);

    /// @notice Emitted with a prepared plugin installation to store data relevant for the application step.
    /// @param sender The sender that prepared the plugin installation.
    /// @param dao The address of the DAO to which the plugin belongs.
    /// @param setupId The setup ID obtained from the supplied data.
    /// @param pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param versionTag The version tag of the plugin setup of the prepared installation.
    /// @param data The bytes-encoded data containing the input parameters for the preparation as specified in the corresponding ABI on the version's metadata.
    /// @param plugin The address of the plugin contract.
    /// @param preparedSetupData The deployed plugin's relevant data which consists of helpers and permissions.
    event InstallationPrepared(
        address indexed sender,
        address indexed dao,
        bytes32 setupId,
        PluginRepo indexed pluginSetupRepo,
        PluginRepo.Tag versionTag,
        bytes data,
        address plugin,
        IPluginSetup.PreparedSetupData preparedSetupData
    );

    /// @notice Emitted after a plugin installation was applied.
    /// @param dao The address of the DAO to which the plugin belongs.
    /// @param plugin The address of the plugin contract.
    /// @param setupId The setup ID obtained from the prepared setup.
    event InstallationApplied(address indexed dao, address indexed plugin, bytes32 setupId);

    /// @notice Emitted with a prepared plugin update to store data relevant for the application step.
    /// @param sender The sender that prepared the plugin update.
    /// @param dao The address of the DAO to which the plugin belongs.
    /// @param pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param versionTag The version tag of the plugin setup of the prepared update.
    /// @param setupPayload The payload containing the existing contracts as well as optional data to be consumed by the plugin setup.
    /// @param preparedSetupData The deployed plugin's relevant data which consists of helpers and permissions.
    /// @param initData The initialization data to be passed to the upgradeable plugin contract.
    event UpdatePrepared(
        address indexed sender,
        address indexed dao,
        bytes32 setupId,
        PluginRepo indexed pluginSetupRepo,
        PluginRepo.Tag versionTag,
        IPluginSetup.SetupPayload setupPayload,
        IPluginSetup.PreparedSetupData preparedSetupData,
        bytes initData
    );

    /// @notice Emitted after a plugin update was applied.
    /// @param dao The address of the DAO to which the plugin belongs.
    /// @param plugin The address of the plugin contract.
    /// @param setupId The setup ID obtained from the prepared setup.
    event UpdateApplied(address indexed dao, address indexed plugin, bytes32 setupId);

    /// @notice Emitted with a prepared plugin uninstallation to store data relevant for the application step.
    /// @param sender The sender that prepared the plugin uninstallation.
    /// @param dao The address of the DAO to which the plugin belongs.
    /// @param setupId The setup ID obtained from the prepared setup.
    /// @param pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param versionTag The version tag of the plugin to used for install preparation.
    /// @param setupPayload The payload containing the existing contracts as well as optional data to be consumed by the plugin setup.
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
    /// @param dao The address of the DAO to which the plugin belongs.
    /// @param plugin The address of the plugin contract.
    /// @param setupId The setup ID obtained from the prepared setup.
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
    /// @return preparedSetupData The deployed plugin's relevant data which consists of helpers and permissions.
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

        bytes32 setupId = _getSetupId(
            _params.pluginSetupRef,
            hashPermissions(preparedSetupData.permissions),
            hashHelpers(preparedSetupData.helpers),
            bytes(""),
            PreparationType.Installation
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
        if (pluginState.blockNumber < pluginState.setupIdToBlockNumber[setupId]) {
            revert SetupAlreadyPrepared(setupId);
        }

        pluginState.setupIdToBlockNumber[setupId] = block.number;

        emit InstallationPrepared({
            sender: msg.sender,
            dao: _dao,
            setupId: setupId,
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

        bytes32 setupId = _getSetupId(
            _params.pluginSetupRef,
            hashPermissions(_params.permissions),
            _params.helpersHash,
            bytes(""),
            PreparationType.Installation
        );

        // Allow calling `applyInstallation` only when
        // plugin was uninstalled or never been installed before.
        if (pluginState.currentSetupId != bytes32(0)) {
            revert PluginAlreadyInstalled();
        }

        validateSetupId(pluginInstallationId, setupId);

        //TODO SARKAWT: Perhaps a comment is needed explaining: why we don't include permission hashes again
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
        // PSP on the DAO should have ROOT permission
        if (_params.permissions.length > 0) {
            DAO(payable(_dao)).applyMultiTargetPermissions(_params.permissions);
        }

        emit InstallationApplied({dao: _dao, plugin: _params.plugin, setupId: newSetupId});
    }

    /// @notice Prepares the update of an UUPS upgradeable plugin.
    /// @param _dao The address of the DAO For which preparation of update happens.
    /// @param _params The struct containing the parameters for the `prepareUpdate` function.
    /// @return initData The initialization data to be passed to upgradeable contracts when the update is applied
    /// @return preparedSetupData The deployed plugin's relevant data which consists of helpers and permissions.
    /// @dev The list of `_currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the update is prepared for
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
            (initData, preparedSetupData) = PluginSetup(newVersion.pluginSetup).prepareUpdate(
                _dao,
                _params.currentVersionTag.build,
                _params.setupPayload
            );

            newSetupId = _getSetupId(
                PluginSetupRef(_params.newVersionTag, _params.pluginSetupRepo),
                hashPermissions(preparedSetupData.permissions),
                hashHelpers(preparedSetupData.helpers),
                initData,
                PreparationType.Update
            );
        }

        // Only allow to prepare if setupId has not been prepared before.
        // Note that the following check ensures that the same setupId can be prepared
        // once again if the plugin was uninstalled and then installed.
        if (pluginState.blockNumber < pluginState.setupIdToBlockNumber[newSetupId]) {
            revert SetupAlreadyPrepared(newSetupId);
        }

        pluginState.setupIdToBlockNumber[newSetupId] = block.number;

        // Avoid stack too deep.
        emitPrepareUpdateEvent(_dao, newSetupId, _params, preparedSetupData, initData);

        return (initData, preparedSetupData);
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
        // PSP on the DAO should have ROOT permission
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
            PreparationType.Uninstallation
        );

        // Only allow to prepare if setupId has not been prepared before.
        // Note that the following check ensures that the same setupId can be prepared
        // once again if the plugin was uninstalled and then installed/updated.
        if (pluginState.blockNumber < pluginState.setupIdToBlockNumber[newSetupId]) {
            revert SetupAlreadyPrepared(newSetupId);
        }

        pluginState.setupIdToBlockNumber[newSetupId] = block.number;

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
            PreparationType.Uninstallation
        );

        validateSetupId(pluginInstallationId, setupId);

        pluginState.blockNumber = block.number;
        pluginState.currentSetupId = bytes32(0);

        // Process the permissions
        // PSP on the DAO should have ROOT permission
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
        // and all the rest setupIdToBlockNumber should become idle or setupId is not prepared before.
        if (pluginState.blockNumber >= pluginState.setupIdToBlockNumber[setupId]) {
            revert SetupNotApplicable(setupId);
        }
    }

    /// @notice Upgrades an `UUPSUpgradeable` proxy contract (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
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
    /// @param _preparedSetupData The deployed plugin's relevant data which consists of helpers and permissions.
    /// @param _initData The initialization data to be passed to upgradeable contracts when the update is applied
    function emitPrepareUpdateEvent(
        address _dao,
        bytes32 _setupId,
        PrepareUpdateParams calldata _params,
        IPluginSetup.PreparedSetupData memory _preparedSetupData,
        bytes memory _initData
    ) private {
        emit UpdatePrepared({
            sender: msg.sender,
            dao: _dao,
            setupId: _setupId,
            pluginSetupRepo: _params.pluginSetupRepo,
            versionTag: _params.newVersionTag,
            setupPayload: _params.setupPayload,
            preparedSetupData: _preparedSetupData,
            initData: _initData
        });
    }
}
