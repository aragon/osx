// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {PermissionLib} from "../../core/permission/PermissionLib.sol";
import {PluginUUPSUpgradeable} from "../../core/plugin/PluginUUPSUpgradeable.sol";
import {IPlugin} from "../../core/plugin/IPlugin.sol";
import {IPluginSetup} from "../IPluginSetup.sol";
import {DaoAuthorizable} from "../../core/component/dao-authorizable/DaoAuthorizable.sol";
import {DAO, IDAO} from "../../core/DAO.sol";
import {PluginRepoRegistry} from "../../registry/PluginRepoRegistry.sol";
import {PluginSetup} from "../PluginSetup.sol";
import {PluginRepo} from "../PluginRepo.sol";
import {isValidBumpLoose, BumpInvalid} from "../SemanticVersioning.sol";
import {PluginSetupRef, hHash, pHash, _getSetupId, _getPluginId} from "./utils/Common.sol";

/// @title PluginSetupProcessor
/// @author Aragon Association - 2022
/// @notice This contract processes the preparation and application of plugin setups (installation, update, uninstallation) on behalf of a requesting DAO.
/// @dev This contract is temporarily granted the `ROOT_PERMISSION_ID` permission on the applying DAO and therefore is highly security critical.
contract PluginSetupProcessor is DaoAuthorizable {
    using ERC165Checker for address;
    using hHash for address;
    using pHash for PermissionLib.ItemMultiTarget[];
    
    /// @notice The ID of the permission required to call the `applyInstallation` function.
    bytes32 public constant APPLY_INSTALLATION_PERMISSION_ID =
        keccak256("APPLY_INSTALLATION_PERMISSION");

    /// @notice The ID of the permission required to call the `applyUpdate` function.
    bytes32 public constant APPLY_UPDATE_PERMISSION_ID = keccak256("APPLY_UPDATE_PERMISSION");

    /// @notice The ID of the permission required to call the `applyUninstallation` function.
    bytes32 public constant APPLY_UNINSTALLATION_PERMISSION_ID =
        keccak256("APPLY_UNINSTALLATION_PERMISSION");

    enum State {
        NONE,
        InstallApplied,
        UpdateApplied,
        UninstallApplied
    }

    struct PluginInformation {
        State state;
        bytes32 currentSetupId;
        bytes32[] setupIds;
    }

    mapping(bytes32 => PluginInformation) private states;


    /// @notice The struct containing the parameters for the `prepareInstallation` function.
    struct PrepareInstall {
        PluginSetupRef pluginSetupRef;
        bytes data;
    }

    /// @notice The struct containing the parameters for the `applyInstallation` function.
    struct ApplyInstall {
        uint256 index;
        PluginSetupRef pluginSetupRef;
        address plugin;
        PermissionLib.ItemMultiTarget[] permissions;
    }

    /// @notice The struct containing the parameters for the `prepareUpdate` function.
    struct PrepareUpdate {
        PluginRepo.Tag currentVersionTag;
        PluginRepo.Tag newVersionTag;
        address pluginSetupRepo;
        IPluginSetup.SetupPayload setupPayload;
    }

    /// @notice The struct containing the parameters for the `applyUpdate` function.
    struct ApplyUpdate {
        uint256 index;
        address plugin;
        PluginSetupRef pluginSetupRef;
        bytes initData;
        PermissionLib.ItemMultiTarget[] permissions;
    }

    /// @notice The struct containing the parameters for the `prepareUninstallation` function.
    struct PrepareUninstall {
        PluginSetupRef pluginSetupRef;
        IPluginSetup.SetupPayload setupPayload;
    }

    /// @notice The struct containing the parameters for the `applyInstallation` function.
    struct ApplyUninstall {
        address plugin;
        PluginSetupRef pluginSetupRef;
        address[] currentHelpers;
        PermissionLib.ItemMultiTarget[] permissions;
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

    /// @notice Thrown if a plugin setup is not prepared.
    error SetupNotPrepared();

    /// @notice Thrown if a plugin setup was already prepared.
    error SetupAlreadyPrepared();

    /// @notice Thrown if a plugin setup is not applied.
    error SetupNotApplied();

    /// @notice Thrown if a plugin setup was already prepared. This is done in case the `PluginSetup` contract is malicios and always/sometime returns the same addresss.
    error SetupAlreadyApplied();

    error PluginInWrongState();
    
    error InvalidSetupId();

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
    function prepareInstallation(address _dao, PrepareInstall calldata _params)
        external
        returns (address plugin, IPluginSetup.PreparedDependency memory preparedDependency)
    {
        PluginRepo pluginSetupRepo = _params.pluginSetupRef.pluginSetupRepo;

        // Check that the plugin repository exists on the plugin repo registry.
        if (!repoRegistry.entries(address(pluginSetupRepo))) {
            revert PluginRepoNonexistent();
        }

        PluginRepo.Version memory version = pluginSetupRepo.getVersion(
            _params.pluginSetupRef.versionTag
        );

        // Prepare the installation
        (plugin, preparedDependency) = PluginSetup(version.pluginSetup).prepareInstallation(
            _dao,
            _params.data
        );
        
        bytes32 pluginId = _getPluginId(_dao, plugin);

        bytes32 setupId = _getSetupId(
            _params.pluginSetupRef,
            preparedDependency.permissions.pHash(),
            preparedDependency.helpers.hHash(),
            bytes32(0)
        );

        PluginInformation storage pluginInformation = states[pluginId];
        if(pluginInformation.state != State.NONE) {
            revert PluginInWrongState();
        }

        pluginInformation.setupIds.push(setupId);
    }

    /// @notice Applies the permissions of a prepared installation to a DAO.
    /// @param _dao The address of the installing DAO.
    /// @param _params The struct containing the parameters for the `applyInstallation` function.
    function applyInstallation(
        address _dao, 
        ApplyInstall calldata _params
    )
        external
        canApply(_dao, APPLY_INSTALLATION_PERMISSION_ID)
    {
        bytes32 pluginId = _getPluginId(_dao, _params.plugin);
        
        PluginInformation storage pluginInformation = states[pluginId];

        if (pluginInformation.state != State.InstallPrepared) {
            revert PluginInWrongState();
        }

        bytes32 chosenSetupId = pluginInformation.setupIds[_params.index];

        bytes32 setupId = _getSetupId( 
            _params.pluginSetupRef,
            _params.permissions.pHash(),
            _params.helpersHash,
            bytes32(0)
        );

        if(setupId != chosenSetupId) {
            revert InvalidSetupId();
        }
        
        pluginInformation.activeSetupId = setupId;

        pluginInformation.state = State.InstallApplied;

        delete pluginInformation.setupIds;

        // Process the permission list.
        DAO(payable(_dao)).bulkOnMultiTarget(_params.permissions);
    }

    /// @notice Prepares the update of an UUPS upgradeable plugin.
    /// @param _dao The address of the installing DAO.
    /// @param _params The struct containing the parameters for the `prepareUpdate` function.
    /// @return permissions The list of multi-targeted permission operations to be applied to the updating DAO.
    /// @return initData The initialization data to be passed to upgradeable contracts when the update is applied
    /// @dev The list of `_currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the update is prepared for
    function prepareUpdate(address _dao, PrepareUpdate calldata _params)
        external
        returns (PermissionLib.ItemMultiTarget[] memory, bytes memory)
    {
        bytes32 pluginId = _getPluginId(_dao, _params.plugin);

        PluginInformation storage pluginInformation = states[pluginId];

        if (
            pluginInformation.state != State.InstallApplied &&
            pluginInformation.state != State.UpdateApplied
        ) {
            revert PluginInWrongState();
        }

        bytes32 setupId = _getSetupId(
            PluginSetupRef(
                _params.currentVersionTag, 
                _params.pluginSetupRepo
            ),
            _params.permissionsHash,
            _params.currentHelpers.hHash(),
            bytes32(0)
        );

        if (pluginInformation.currentSetupId != setupId) {
            revert PluginInWrongState();
        }

         // `getVersionByPluginSetup` will revert if `currentPluginSetup` is not part of `pluginSetupRepo`.
        PluginRepo.Version memory newVersion = _params.pluginSetupRepo.getVersionByPluginSetup(
            _params.newVersionTag
        );

        // Prepare the update.
        (
            bytes memory initData,
            IPluginSetup.PreparedDependency memory preparedDependency
        ) = PluginSetup(newVersion.pluginSetup).prepareUpdate(
                _dao,
                _params.currentVersionTag.build,
                _params.setupPayload
            );
        
        bytes32 newSetupId = _getSetupId(
            PluginSetupRef(
                _params.newVersionTag, 
                _params.pluginSetupRepo
            ),
            preparedDependency.permissions.pHash(),
            preparedDependency.helpers.hHash(),
            initData
        );

        pluginInformation.setupIds.push(newSetupId);

        return (preparedDependency.permissions, initData);
    }

    /// @notice Applies the permissions of a prepared update of an UUPS upgradeable contract to a DAO.
    /// @param _dao The address of the updating DAO.
    /// @param _params The struct containing the parameters for the `applyInstallation` function.
    function applyUpdate(address _dao, ApplyUpdate calldata _params)
        external
        canApply(_dao, APPLY_UPDATE_PERMISSION_ID)
    {
        bytes32 pluginId = _getPluginId(_dao, _params.plugin);

        PluginInformation storage pluginInformation = states[pluginId];

        if (
            pluginInformation.state != State.InstallApplied &&
            pluginInformation.state != State.UpdateApplied
        ) {
            revert PluginInWrongState();
        }

        bytes32 setupId = _getSetupId(
            _params.pluginSetupRef,
            _params.permissions.pHash(),
            _params.helpersHash,
            _params.data
        );

        bytes32 chosenSetupId = pluginInformation.setupIds[_params.index];

        if(chosenSetupId != setupId) {
            // revert
        }
        
        pluginInformation.currentSetupId = _getSetupId(
            _params.pluginSetupRef,
            _params.permissions.pHash(),
            _params.helpersHash,
            bytes32(0)
        );

        delete pluginInformation.setupIds;

        pluginInformation.state != State.UpdateApplied;

        PluginRepo.Version memory version = _params.pluginSetupRepo.getVersion(_params.versionTag);

        address currentImplementation = PluginUUPSUpgradeable(_params.plugin)
            .getImplementationAddress();
        address newImplementation = PluginSetup(version.pluginSetup).getImplementationAddress();

        if (currentImplementation != newImplementation) {
            _upgradeProxy(_params.plugin, newImplementation, _params.initData);
        }

        DAO(payable(_dao)).bulkOnMultiTarget(_params.permissions);
    }

    /// @notice Prepares the uninstallation of a plugin.
    /// @param _dao The address of the installing DAO.
    /// @param _params The struct containing the parameters for the `prepareUninstallation` function.
    /// @return permissions The list of multi-targeted permission operations to be applied to the uninstalling DAO.
    /// @dev The list of `_currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the uninstallation was prepared for
    function prepareUninstallation(address _dao, PrepareUninstall calldata _params)
        external
        returns (PermissionLib.ItemMultiTarget[] memory permissions)
    {
        // bytes32 setupId = _getSetupId(_dao, _params.pluginSetupRef, _params.plugin);

        // PluginInformation storage pluginInformation = states[setupId];

        // if (
        //     pluginInformation.state != State.InstallApplied &&
        //     pluginInformation.state != State.UpdateApplied
        // ) {
        //     revert PluginInWrongState();
        // }

        // if (pluginInformation.helpersHash != _getHelpersHash(_params.currentHelpers)) {
        //     revert HelpersHashMismatch();
        // }

        // // Reverts if not found.
        // PluginRepo.Version memory version = _params.pluginSetupRepo.getVersion(_params.versionTag);

        // // Finally, After all the validation steps are run,
        // // start preparing uninstallation and run
        // // the developer's code for the uninstallation.
        // permissions = PluginSetup(version.pluginSetup).prepareUninstallation(
        //     _dao,
        //     _params.plugin,
        //     _params.currentHelpers,
        //     _params.data
        // );

        // // set permission hashes.
        // pluginInformation.permissionsHashes = _getPermissionsHash(permissions);

        // // emit UninstallationPrepared({
        // //     sender: msg.sender,
        // //     plugin: _params.plugin,
        // //     dao: _dao,
        // //     pluginSetupRepo: _params.pluginSetupRepo,
        // //     versionTag: _params.versionTag,
        // //     data: _params.data,
        // //     currentHelpers: _params.currentHelpers,
        // //     permissions: permissions
        // // });
    }

    /// @notice Applies the permissions of a prepared uninstallation to a DAO.
    /// @param _dao The address of the DAO.
    /// @param _dao The address of the installing DAO.
    /// @param _params The struct containing the parameters for the `applyUninstallation` function.
    /// @dev The list of `_currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the uninstallation was prepared for.
    function applyUninstallation(address _dao, ApplyUninstall calldata _params)
        external
        canApply(_dao, APPLY_UNINSTALLATION_PERMISSION_ID)
    {
        // bytes32 setupId = _getSetupId(_dao, _params.pluginSetupRef, _params.plugin);

        // PluginInformation storage pluginInformation = states[setupId];

        // if (pluginInformation.state != State.UninstallPrepared) {
        //     revert PluginInWrongState();
        // }

        // if (pluginInformation.permissionsHash != _getPermissionsHash(_params.permissions)) {
        //     revert PermissionsHashMismatch();
        // }

        // DAO(payable(_dao)).bulkOnMultiTarget(_params.permissions);

        // // Free up space by deleting the helpers and permission hash being not needed anymore.
        // delete states[setupId];

        // // emit UninstallationApplied({
        // //     dao: _dao,
        // //     plugin: _params.plugin,
        // //     pluginSetupRepo: _params.pluginSetupRepo,
        // //     versionTag: _params.versionTag
        // // });
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


//  struct Hashes {
//             bytes32 permissionsHash;
//             bytes32 helpersHash;
//             bytes32 setupId; 
//         }

//         struct PluginInformation {
//             State state;
//             bytes32 currentSetupId;
//             Hashes current;
//             Hashes[] hashes;
//         }

//         mapping(bytes32 => PluginInformation) private states;
