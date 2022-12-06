// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {PermissionLib} from "../../core/permission/PermissionLib.sol";
import {PluginUUPSUpgradeable} from "../../core/plugin/PluginUUPSUpgradeable.sol";
import {IPlugin} from "../../core/plugin/IPlugin.sol";
import {DaoAuthorizable} from "../../core/component/dao-authorizable/DaoAuthorizable.sol";
import {DAO, IDAO} from "../../core/DAO.sol";
import {PluginRepoRegistry} from "../../registry/PluginRepoRegistry.sol";
import {PluginSetup} from "../PluginSetup.sol";
import {PluginRepo} from "../PluginRepo.sol";
import {isValidBumpLoose, BumpInvalid} from "../SemanticVersioning.sol";
import {executePrepareUpdate, validatePrepareUpdate, PrepareUpdateParams} from "./utils/Update.sol";

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

    /// @notice The struct containing the parameters for the `prepareInstallation` function.
    struct PrepareInstallParams {
        PluginRepo.Tag versionTag;
        PluginRepo pluginSetupRepo;
        bytes data;
    }

    /// @notice The struct containing the parameters for the `applyInstallation` function.
    struct ApplyInstallParams {
        PluginRepo.Tag versionTag;
        PluginRepo pluginSetupRepo;
        address plugin;
        PermissionLib.ItemMultiTarget[] permissions;
    }

    /// @notice The struct containing the parameters for the `applyUpdate` function.
    struct ApplyUpdateParams {
        address plugin;
        PluginRepo.Tag versionTag;
        PluginRepo pluginSetupRepo;
        bytes initData;
        PermissionLib.ItemMultiTarget[] permissions;
    }

    /// @notice The struct containing the parameters for the `prepareUninstallation` function.
    struct PrepareUninstallParams {
        address plugin;
        PluginRepo.Tag versionTag;
        PluginRepo pluginSetupRepo;
        address[] currentHelpers;
        bytes data;
    }

    /// @notice The struct containing the parameters for the `applyInstallation` function.
    struct ApplyUninstallParams {
        address plugin;
        PluginRepo.Tag versionTag;
        PluginRepo pluginSetupRepo;
        address[] currentHelpers;
        PermissionLib.ItemMultiTarget[] permissions;
    }

    /// @notice A mapping between a plugin's installations `appliedId` (see [`getAppliedId`](#private-function-`getAppliedId`)) and a boolean expressing if it has been applied. This is used to guarantees that a plugin can only be installed once.
    mapping(bytes32 => bool) private isInstallationApplied;

    /// @notice A mapping between a plugin's [`setupId`](#private-function-`getSetupId`) and the hashed, multi-targeted permission operation list obtained from the [`prepareInstallation`](#external-function-`prepareInstallation`) function.
    mapping(bytes32 => bytes32) private installPermissionHashes;

    /// @notice A mapping between a plugin's [`setupId`](#private-function-`getSetupId`) and the hashed, multi-targeted permission operation list obtained from the [`prepareUpdate`](#external-function-`prepareUpdate`) function.
    mapping(bytes32 => bytes32) private updatePermissionHashes;

    /// @notice A mapping between a plugin's [`setupId`](#private-function-`getSetupId`) and the hashed, multi-targeted permission operation list obtained from the [`prepareUninstallation`](#external-function-`prepareUninstallation`) function.
    mapping(bytes32 => bytes32) private uninstallPermissionHashes;

    /// @notice A mapping between a plugin's [`setupId`](#private-function-`getSetupId`) and the array of helper addresses hashed via [`getHelpersHash`](#private-function-`getHelpersHash`).
    mapping(bytes32 => bytes32) private helpersHashes;

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

    /// @notice Thrown if a plugin setup is not prepared.
    error SetupNotPrepared();

    /// @notice Thrown if a plugin setup was already prepared.
    error SetupAlreadyPrepared();

    /// @notice Thrown if a plugin setup is not applied.
    error SetupNotApplied();

    /// @notice Thrown if a plugin setup was already prepared. This is done in case the `PluginSetup` contract is malicios and always/sometime returns the same addresss.
    error SetupAlreadyApplied();

    /// @notice Emitted with a prepared plugin installation to store data relevant for the application step.
    /// @param sender The sender that prepared the plugin installation.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param versionTag The version tag of the plugin to used for install preparation.
    /// @param data The `bytes` encoded data containing the input parameters for the installation as specified in the `prepareInstallationDataABI()` function in the `pluginSetup` setup contract.
    /// @param plugin The address of the plugin contract.
    /// @param helpers The address array of all helpers (contracts or EOAs) that were prepared for the plugin to be installed.
    /// @param permissions The list of multi-targeted permission operations to be applied to the installing DAO.
    event InstallationPrepared(
        address indexed sender,
        address indexed dao,
        PluginRepo indexed pluginSetupRepo,
        PluginRepo.Tag versionTag,
        bytes data,
        address plugin,
        address[] helpers,
        PermissionLib.ItemMultiTarget[] permissions
    );

    /// @notice Emitted after a plugin installation was applied.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param plugin The address of the plugin contract.
    /// @param pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param versionTag The version tag of the plugin to used for install preparation.
    event InstallationApplied(
        address indexed dao,
        address indexed plugin,
        PluginRepo indexed pluginSetupRepo,
        PluginRepo.Tag versionTag
    );

    /// @notice Emitted with a prepared plugin update to store data relevant for the application step.
    /// @param sender The sender that prepared the plugin installation.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param versionTag The version tag of the plugin to used for install preparation.
    /// @param data The `bytes` encoded data containing the input parameters for the installation as specified in the `prepareInstallationDataABI()` function in the `pluginSetup` setup contract.
    /// @param plugin The address of the plugin contract.
    /// @param updatedHelpers The address array of all helpers (contracts or EOAs) that were prepared for the plugin update.
    /// @param permissions The list of multi-targeted permission operations to be applied to the installing DAO.
    /// @param initData The initialization data to be passed to the upgradeable plugin contract.
    event UpdatePrepared(
        address indexed sender,
        address indexed dao,
        PluginRepo indexed pluginSetupRepo,
        PluginRepo.Tag versionTag,
        bytes data,
        address plugin,
        address[] updatedHelpers,
        PermissionLib.ItemMultiTarget[] permissions,
        bytes initData
    );

    /// @notice Emitted after a plugin update was applied.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param plugin The address of the plugin contract.
    /// @param pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param versionTag The version tag of the plugin to used for install preparation.
    event UpdateApplied(
        address indexed dao,
        address indexed plugin,
        PluginRepo indexed pluginSetupRepo,
        PluginRepo.Tag versionTag
    );

    /// @notice Emitted with a prepared plugin uninstallation to store data relevant for the application step.
    /// @param sender The sender that prepared the plugin uninstallation.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param versionTag The version tag of the plugin to used for install preparation.
    /// @param data The `bytes` encoded data containing the input parameters for the uninstallation as specified in the `prepareUninstallationDataABI()` function in the `pluginSetup` setup contract.
    /// @param plugin The address of the plugin contract.
    /// @param currentHelpers The address array of all helpers (contracts or EOAs) that were prepared for the plugin to be installed.
    /// @param permissions The list of multi-targeted permission operations to be applied to the installing DAO.
    event UninstallationPrepared(
        address indexed sender,
        address indexed dao,
        PluginRepo indexed pluginSetupRepo,
        PluginRepo.Tag versionTag,
        bytes data,
        address plugin,
        address[] currentHelpers,
        PermissionLib.ItemMultiTarget[] permissions
    );

    /// @notice Emitted after a plugin installation was applied.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param plugin The address of the plugin contract.
    /// @param pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param versionTag The version tag of the plugin to used for install preparation.
    event UninstallationApplied(
        address indexed dao,
        address indexed plugin,
        PluginRepo indexed pluginSetupRepo,
        PluginRepo.Tag versionTag
    );

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
    /// @return helpers The prepared list of helper contract addresses, that a plugin might require to operate.
    /// @return permissions The prepared list of multi-targeted permission operations to be applied to the installing DAO.
    function prepareInstallation(address _dao, PrepareInstallParams calldata _params)
        external
        returns (
            address plugin,
            address[] memory helpers,
            PermissionLib.ItemMultiTarget[] memory permissions
        )
    {
        // Check that the plugin repository exists on the plugin repo registry.
        if (!repoRegistry.entries(address(_params.pluginSetupRepo))) {
            revert PluginRepoNonexistent();
        }

        PluginRepo.Version memory version = _params.pluginSetupRepo.getVersion(_params.versionTag);

        address pluginSetup = version.pluginSetup;

        // Prepare the installation
        (plugin, helpers, permissions) = PluginSetup(pluginSetup).prepareInstallation(
            _dao,
            _params.data
        );

        // Important safety measure to include dao + plugin manager in the encoding.
        bytes32 setupId = _getSetupId(
            _dao,
            _params.versionTag,
            address(_params.pluginSetupRepo),
            plugin
        );

        // Check if the installation was prepared already.
        if (installPermissionHashes[setupId] != bytes32(0)) {
            revert SetupAlreadyPrepared();
        }

        installPermissionHashes[setupId] = _getPermissionsHash(permissions);

        helpersHashes[setupId] = _getHelpersHash(helpers);

        emit InstallationPrepared({
            sender: msg.sender,
            dao: _dao,
            pluginSetupRepo: _params.pluginSetupRepo,
            versionTag: _params.versionTag,
            data: _params.data,
            plugin: plugin,
            helpers: helpers,
            permissions: permissions
        });
    }

    /// @notice Applies the permissions of a prepared installation to a DAO.
    /// @param _dao The address of the installing DAO.
    /// @param _params The struct containing the parameters for the `applyInstallation` function.
    function applyInstallation(address _dao, ApplyInstallParams calldata _params)
        external
        canApply(_dao, APPLY_INSTALLATION_PERMISSION_ID)
    {
        // Check if the installation was applied already.
        bytes32 appliedId = _getAppliedId(_dao, _params.plugin);
        if (isInstallationApplied[appliedId]) {
            revert SetupAlreadyApplied();
        }

        bytes32 setupId = _getSetupId(
            _dao,
            _params.versionTag,
            address(_params.pluginSetupRepo),
            _params.plugin
        );
        bytes32 storedPermissionsHash = installPermissionHashes[setupId];

        // Check if the installation was prepared.
        if (storedPermissionsHash == bytes32(0)) {
            revert SetupNotPrepared();
        }

        // Check that the permissions match those announced in the preparation step.
        if (storedPermissionsHash != _getPermissionsHash(_params.permissions)) {
            revert PermissionsHashMismatch();
        }

        // Process the permission list.
        DAO(payable(_dao)).bulkOnMultiTarget(_params.permissions);

        // Mark this installation as applied.
        isInstallationApplied[appliedId] = true;

        // Emit the event to associate the installed plugin with the installing DAO.
        emit InstallationApplied({
            dao: _dao,
            plugin: _params.plugin,
            pluginSetupRepo: _params.pluginSetupRepo,
            versionTag: _params.versionTag
        });

        // Free up space by deleting the permission hash being not needed anymore.
        delete installPermissionHashes[setupId];
    }

    /// @notice Prepares the update of an UUPS upgradeable plugin.
    /// @param _dao The address of the installing DAO.
    /// @param _params The struct containing the parameters for the `prepareUpdate` function.
    /// @return permissions The list of multi-targeted permission operations to be applied to the updating DAO.
    /// @return initData The initialization data to be passed to upgradeable contracts when the update is applied
    /// @dev The list of `_currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the update is prepared for
    function prepareUpdate(address _dao, PrepareUpdateParams calldata _params)
        external
        returns (PermissionLib.ItemMultiTarget[] memory, bytes memory)
    {
        // Implicitly confirms plugin setups are valid. // TODO Revisit this as this might not be true.
        // ensure repo for plugin manager exists
        if (!repoRegistry.entries(address(_params.pluginSetupRepo))) {
            revert PluginRepoNonexistent();
        }

        address pluginSetup = validatePrepareUpdate(
            _dao,
            _params,
            setupId,
            isInstallationApplied,
            helpersHashes
        );

        // Prepare the update.
        (
            address[] memory updatedHelpers,
            bytes memory initData,
            PermissionLib.ItemMultiTarget[] memory permissions
        ) = executePrepareUpdate(
            _dao, 
            pluginSetup,
            _params, 
            helpersHashes, 
            updatePermissionHashes
        );
        
        emit UpdatePrepared({
            sender: msg.sender,
            dao: _dao,
            pluginSetupRepo: _params.pluginSetupRepo,
            versionTag: _params.newVersionTag,
            data: _params.data,
            plugin: _params.plugin,
            updatedHelpers: updatedHelpers,
            permissions: permissions,
            initData: initData
        });

        return (permissions, initData);
    }

    /// @notice Applies the permissions of a prepared update of an UUPS upgradeable contract to a DAO.
    /// @param _dao The address of the updating DAO.
    /// @param _params The struct containing the parameters for the `applyInstallation` function.
    function applyUpdate(address _dao, ApplyUpdateParams calldata _params)
        external
        canApply(_dao, APPLY_UPDATE_PERMISSION_ID)
    {
        bytes32 setupId = _getSetupId(
            _dao,
            _params.versionTag,
            address(_params.pluginSetupRepo),
            _params.plugin
        );

        if (updatePermissionHashes[setupId] != _getPermissionsHash(_params.permissions)) {
            revert PermissionsHashMismatch();
        }

        PluginRepo.Version memory version = _params.pluginSetupRepo.getVersion(_params.versionTag);

        address currentImplementation = PluginUUPSUpgradeable(_params.plugin)
            .getImplementationAddress();
        address newImplementation = PluginSetup(version.pluginSetup).getImplementationAddress();

        if (currentImplementation != newImplementation) {
            _upgradeProxy(_params.plugin, newImplementation, _params.initData);
        }

        DAO(payable(_dao)).bulkOnMultiTarget(_params.permissions);

        // Free up space by deleting the permission hash being not needed anymore.
        delete updatePermissionHashes[setupId];

        emit UpdateApplied({
            dao: _dao,
            plugin: _params.plugin,
            pluginSetupRepo: _params.pluginSetupRepo,
            versionTag: _params.versionTag
        });
    }

    /// @notice Prepares the uninstallation of a plugin.
    /// @param _dao The address of the installing DAO.
    /// @param _params The struct containing the parameters for the `prepareUninstallation` function.
    /// @return permissions The list of multi-targeted permission operations to be applied to the uninstalling DAO.
    /// @dev The list of `_currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the uninstallation was prepared for
    function prepareUninstallation(address _dao, PrepareUninstallParams calldata _params)
        external
        returns (PermissionLib.ItemMultiTarget[] memory permissions)
    {
        // Ensure repo for plugin manager exists
        if (!repoRegistry.entries(address(_params.pluginSetupRepo))) {
            revert PluginRepoNonexistent();
        }

        // Check if plugin is installed in the first place.
        if (!isInstallationApplied[_getAppliedId(_dao, _params.plugin)]) {
            revert SetupNotApplied();
        }

        bytes32 setupId = _getSetupId(
            _dao,
            _params.versionTag,
            address(_params.pluginSetupRepo),
            _params.plugin
        );

        // Check if this the very same plugin uninstallation is already prepared and revert if so.
        if (uninstallPermissionHashes[setupId] != bytes32(0)) {
            revert SetupAlreadyPrepared();
        }

        // Ensures that the same helpers are passed that were emitted on the last update of the plugin.
        // This is important to ensure that plugin developer gets the correct data for use.
        if (helpersHashes[setupId] != _getHelpersHash(_params.currentHelpers)) {
            revert HelpersHashMismatch();
        }

        // Reverts if not found.
        PluginRepo.Version memory version = _params.pluginSetupRepo.getVersion(_params.versionTag);

        // Finally, After all the validation steps are run,
        // start preparing uninstallation and run
        // the developer's code for the uninstallation.
        permissions = PluginSetup(version.pluginSetup).prepareUninstallation(
            _dao,
            _params.plugin,
            _params.currentHelpers,
            _params.data
        );

        // set permission hashes.
        uninstallPermissionHashes[setupId] = _getPermissionsHash(permissions);

        emit UninstallationPrepared({
            sender: msg.sender,
            plugin: _params.plugin,
            dao: _dao,
            pluginSetupRepo: _params.pluginSetupRepo,
            versionTag: _params.versionTag,
            data: _params.data,
            currentHelpers: _params.currentHelpers,
            permissions: permissions
        });
    }

    /// @notice Applies the permissions of a prepared uninstallation to a DAO.
    /// @param _dao The address of the DAO.
    /// @param _dao The address of the installing DAO.
    /// @param _params The struct containing the parameters for the `applyUninstallation` function.
    /// @dev The list of `_currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the uninstallation was prepared for.
    function applyUninstallation(address _dao, ApplyUninstallParams calldata _params)
        external
        canApply(_dao, APPLY_UNINSTALLATION_PERMISSION_ID)
    {
        bytes32 setupId = _getSetupId(
            _dao,
            _params.versionTag,
            address(_params.pluginSetupRepo),
            _params.plugin
        );

        // Check if the helpers match with those announced in the preparation step.
        if (helpersHashes[setupId] != _getHelpersHash(_params.currentHelpers)) {
            revert HelpersHashMismatch();
        }

        bytes32 storedPermissionsHash = uninstallPermissionHashes[setupId];
        bytes32 passedPermissionsHash = _getPermissionsHash(_params.permissions);

        // Check that the permissions match those announced in the preparation step.
        if (storedPermissionsHash != passedPermissionsHash) {
            revert PermissionsHashMismatch();
        }

        DAO(payable(_dao)).bulkOnMultiTarget(_params.permissions);

        // Free up space by deleting the helpers and permission hash being not needed anymore.
        delete helpersHashes[setupId];
        delete uninstallPermissionHashes[setupId];

        emit UninstallationApplied({
            dao: _dao,
            plugin: _params.plugin,
            pluginSetupRepo: _params.pluginSetupRepo,
            versionTag: _params.versionTag
        });
    }

    /// @notice Returns an identifier for applied installations by hashing the DAO and plugin address.
    /// @param _dao The address of the DAO conducting the setup.
    /// @param _plugin The address of the `Plugin` contract associated with the setup.
    function _getAppliedId(address _dao, address _plugin) private pure returns (bytes32 appliedId) {
        appliedId = keccak256(abi.encode(_dao, _plugin));
    }

    /// @notice Returns an identifier for prepared installations by hashing the DAO and plugin address.
    /// @param _dao The address of the DAO conducting the setup.
    /// @param _versionTag The exact version of the plugin to install.
    /// @param _pluginSetupRepo The address of plugin setup repo.
    /// @param _plugin The address of the `Plugin` contract associated with the setup.
    function _getSetupId(
        address _dao,
        PluginRepo.Tag calldata _versionTag,
        address _pluginSetupRepo,
        address _plugin
    ) private pure returns (bytes32 setupId) {
        setupId = keccak256(abi.encode(_dao, _versionTag, _pluginSetupRepo, _plugin));
    }

    /// @notice Returns a hash of an array of helper addresses (contracts or EOAs).
    /// @param _helpers The array of helper addresses (contracts or EOAs) to be hashed.
    function _getHelpersHash(address[] memory _helpers) private pure returns (bytes32 helpersHash) {
        helpersHash = keccak256(abi.encode(_helpers));
    }

    /// @notice Returns a hash of an array of multi-targeted permission operations.
    /// @param _permissions The array of of multi-targeted permission operations.
    /// @return bytes The hash of the array of permission operations.
    function _getPermissionsHash(PermissionLib.ItemMultiTarget[] memory _permissions)
        private
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(_permissions));
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
            } catch (
                bytes memory /*lowLevelData*/
            ) {
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
            } catch (
                bytes memory /*lowLevelData*/
            ) {
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


}
