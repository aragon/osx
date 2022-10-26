// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {PermissionLib} from "../../../general/permission/PermissionLib.sol";
import {PluginUUPSUpgradeable} from "../../primitives/PluginUUPSUpgradeable.sol";
import {IPlugin} from "../../primitives/IPlugin.sol";
import {DaoAuthorizable} from "../../../general/dao-authorizable/DaoAuthorizable.sol";
import {IDAO} from "../../../dao/primitives/IDAO.sol";
import {DAO} from "../../../dao/primitives/DAO.sol";
import {PluginRepoRegistry} from "../registry/PluginRepoRegistry.sol";
import {PluginRepo} from "../registry/PluginRepo.sol";
import {PluginSetup} from "../setup/PluginSetup.sol";

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

    struct PluginUpdateParams {
        address plugin; // The address of the `Plugin` contract being currently active. This can be a proxy or a concrete instance.
        PluginRepo pluginSetupRepo; // The repository storing the `PluginSetup` contracts of all versions of a plugin.
        address currentPluginSetup; // The `PluginSetup` contract of the version being currently active and to be updated from.
        address newPluginSetup; // The `PluginSetup` contract of the version to be updated to.
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

    /// @notice Thrown if a contract does not support the `IPlugin` interface.
    /// @param plugin The address of the contract.
    error IPluginNotSupported(address plugin);

    /// @notice Thrown if two permissions hashes obtained via [`getPermissionsHash`](#private-function-`getPermissionsHash`) don't match.
    error PermissionsHashMismatch();

    /// @notice Thrown if two helpers hashes obtained via  [`getHelpersHash`](#private-function-`getHelpersHash`) don't match.
    error HelpersHashMismatch();

    /// @notice Thrown if a plugin repository is empty.
    error EmptyPluginRepo();

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
    /// @param pluginSetup The address of the `PluginSetup` contract used for the installation.
    /// @param data The `bytes` encoded data containing the input parameters for the installation as specified in the `prepareInstallationDataABI()` function in the `pluginSetup` setup contract.
    /// @param plugin The address of the plugin contract.
    /// @param helpers The address array of all helpers (contracts or EOAs) that were prepared for the plugin to be installed.
    /// @param permissions The list of multi-targeted permission operations to be applied to the installing DAO.

    event InstallationPrepared(
        address indexed sender,
        address indexed dao,
        address indexed pluginSetup,
        bytes data,
        address plugin,
        address[] helpers,
        PermissionLib.ItemMultiTarget[] permissions
    );

    /// @notice Emitted after a plugin installation was applied.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param plugin The address of the plugin contract.
    event InstallationApplied(address dao, address plugin);

    /// @notice Emitted with a prepared plugin update to store data relevant for the application step.
    /// @param sender The sender that prepared the plugin installation.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param pluginSetup The address of the `PluginSetup` contract used for the update.
    /// @param data The `bytes` encoded data containing the input parameters for the installation as specified in the `prepareInstallationDataABI()` function in the `pluginSetup` setup contract.
    /// @param plugin The address of the plugin contract.
    /// @param updatedHelpers The address array of all helpers (contracts or EOAs) that were prepared for the plugin update.
    /// @param permissions The list of multi-targeted permission operations to be applied to the installing DAO.
    /// @param initData The initialization data to be passed to the upgradeable plugin contract.
    event UpdatePrepared(
        address indexed sender,
        address indexed dao,
        address indexed pluginSetup,
        bytes data,
        address plugin,
        address[] updatedHelpers,
        PermissionLib.ItemMultiTarget[] permissions,
        bytes initData
    );

    /// @notice Emitted after a plugin update was applied.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param plugin The address of the plugin contract.
    event UpdateApplied(address indexed dao, address indexed plugin);

    /// @notice Emitted with a prepared plugin uninstallation to store data relevant for the application step.
    /// @param sender The sender that prepared the plugin uninstallation.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param pluginSetup The address of the `PluginSetup` contract used for the uninstallation.
    /// @param data The `bytes` encoded data containing the input parameters for the uninstallation as specified in the `prepareUninstallationDataABI()` function in the `pluginSetup` setup contract.
    /// @param plugin The address of the plugin contract.
    /// @param currentHelpers The address array of all helpers (contracts or EOAs) that were prepared for the plugin to be installed.
    /// @param permissions The list of multi-targeted permission operations to be applied to the installing DAO.
    event UninstallationPrepared(
        address indexed sender,
        address indexed dao,
        address indexed pluginSetup,
        bytes data,
        address plugin,
        address[] currentHelpers,
        PermissionLib.ItemMultiTarget[] permissions
    );

    /// @notice Emitted after a plugin installation was applied.
    /// @param dao The address of the dao to which the plugin belongs.
    /// @param plugin The address of the plugin contract.
    event UninstallationApplied(address indexed dao, address indexed plugin);

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
    /// @param _pluginSetup The address of the `PluginSetup` contract.
    /// @param _pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param _data The `bytes` encoded data containing the input parameters for the installation as specified in the `prepareInstallationDataABI()` function in the `pluginSetup` setup contract.
    /// @return plugin The prepared plugin contract address.
    /// @return helpers The prepared list of helper contract addresses, that a plugin might require to operate.
    /// @return permissions The prepared list of multi-targeted permission operations to be applied to the installing DAO.
    function prepareInstallation(
        address _dao,
        address _pluginSetup,
        PluginRepo _pluginSetupRepo,
        bytes memory _data
    )
        external
        returns (
            address plugin,
            address[] memory helpers,
            PermissionLib.ItemMultiTarget[] memory permissions
        )
    {
        // ensure repo for plugin manager exists
        if (!repoRegistry.entries(address(_pluginSetupRepo))) {
            revert EmptyPluginRepo();
        }

        // Reverts if pluginSetup doesn't exist on the repo...
        _pluginSetupRepo.getVersionByPluginSetup(_pluginSetup);

        // prepareInstallation
        (plugin, helpers, permissions) = PluginSetup(_pluginSetup).prepareInstallation(_dao, _data);

        // Important safety measure to include dao + plugin manager in the encoding.
        bytes32 setupId = _getSetupId(_dao, _pluginSetup, address(_pluginSetupRepo), plugin);

        // Check if this plugin installation is already prepared
        if (installPermissionHashes[setupId] != bytes32(0)) {
            revert SetupAlreadyPrepared();
        }

        installPermissionHashes[setupId] = _getPermissionsHash(permissions);

        helpersHashes[setupId] = _getHelpersHash(helpers);

        emit InstallationPrepared({
            sender: msg.sender,
            dao: _dao,
            pluginSetup: _pluginSetup,
            data: _data,
            plugin: plugin,
            helpers: helpers,
            permissions: permissions
        });
    }

    /// @notice Applies the permissions of a prepared installation to a DAO.
    /// @param _dao The address of the installing DAO.
    /// @param _pluginSetup The address of the `PluginSetup` contract.
    /// @param _pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param _plugin The address of the `Plugin` contract.
    /// @param _permissions The list of multi-targeted permission operations to apply to the installing DAO.
    function applyInstallation(
        address _dao,
        address _pluginSetup,
        PluginRepo _pluginSetupRepo,
        address _plugin,
        PermissionLib.ItemMultiTarget[] calldata _permissions
    ) external canApply(_dao, APPLY_INSTALLATION_PERMISSION_ID) {
        bytes32 appliedId = _getAppliedId(_dao, _plugin);

        if (isInstallationApplied[appliedId]) {
            revert SetupAlreadyApplied();
        }

        bytes32 setupId = _getSetupId(_dao, _pluginSetup, address(_pluginSetupRepo), _plugin);

        bytes32 storedPermissionsHash = installPermissionHashes[setupId];

        // check if plugin was actually deployed..
        if (storedPermissionsHash == bytes32(0)) {
            revert SetupNotPrepared();
        }

        bytes32 passedPermissionsHash = _getPermissionsHash(_permissions);

        // check that permissions weren't tempered.
        if (storedPermissionsHash != passedPermissionsHash) {
            revert PermissionsHashMismatch();
        }

        // apply permissions on a dao..
        DAO(payable(_dao)).bulkOnMultiTarget(_permissions);

        // set is installation processed
        isInstallationApplied[appliedId] = true;

        // emit the event to connect plugin to the dao.
        emit InstallationApplied({dao: _dao, plugin: _plugin});

        delete installPermissionHashes[setupId];
    }

    /* TODO: might we need to check when `prepareUpdate` gets called, if plugin actually was installed ?
     * Though problematic, since this check only happens when plugin updates from 1.0 to 1.x
     * and checking it always would cost more... shall we still check it and how ? */
    /// @notice Prepares the update of an UUPS upgradeable plugin.
    /// @param _dao The address of the installing DAO.
    /// @param _updateParams The parameters of the update.
    /// @param _currentHelpers The address array of all current helpers (contracts or EOAs) associated with the plugin that is prepared to be updated.
    /// @param _data The `bytes` encoded data containing the input parameters for the update as specified in the `prepareUpdateDataABI()` function in the `newPluginSetup` setup contract inside `_updateParams`.
    /// @return permissions The list of multi-targeted permission operations to be applied to the updating DAO.
    /// @return initData The initialization data to be passed to upgradeable contracts when the update is applied
    /// @dev The list of `_currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the update is prepared for.
    function prepareUpdate(
        address _dao,
        PluginUpdateParams calldata _updateParams,
        address[] calldata _currentHelpers,
        bytes memory _data
    ) external returns (PermissionLib.ItemMultiTarget[] memory, bytes memory) {
        // check that plugin inherits is PluginUUPSUpgradable.
        if (!_updateParams.plugin.supportsInterface(type(IPlugin).interfaceId)) {
            revert IPluginNotSupported({plugin: _updateParams.plugin});
        }

        if (IPlugin(_updateParams.plugin).pluginType() != IPlugin.PluginType.UUPS) {
            revert PluginNonupgradeable({plugin: _updateParams.plugin});
        }

        // Implicitly confirms plugin setups are valid. // TODO Revisit this as this might not be true.
        // ensure repo for plugin manager exists
        if (!repoRegistry.entries(address(_updateParams.pluginSetupRepo))) {
            revert EmptyPluginRepo();
        }

        // Check if plugin is applied
        bytes32 appliedId = _getAppliedId(_dao, _updateParams.plugin);
        if (!isInstallationApplied[appliedId]) {
            revert SetupNotApplied();
        }

        (uint16[3] memory oldVersion, , ) = _updateParams.pluginSetupRepo.getVersionByPluginSetup(
            _updateParams.currentPluginSetup
        );

        // Reverts if newPluginSetup doesn't exist on the repo...
        _updateParams.pluginSetupRepo.getVersionByPluginSetup(_updateParams.newPluginSetup);

        // Avoid stack too deep compiler error by putting the code into curly braces.
        {
            // Check if helpers are correct...
            // Implicitly checks if plugin was installed in the first place.
            bytes32 oldSetupId = _getSetupId(
                _dao,
                _updateParams.currentPluginSetup,
                address(_updateParams.pluginSetupRepo),
                _updateParams.plugin
            );

            if (helpersHashes[oldSetupId] != _getHelpersHash(_currentHelpers)) {
                revert HelpersHashMismatch();
            }

            delete helpersHashes[oldSetupId];
        }

        // prepare update
        (
            address[] memory updatedHelpers,
            bytes memory initData,
            PermissionLib.ItemMultiTarget[] memory permissions
        ) = PluginSetup(_updateParams.newPluginSetup).prepareUpdate(
                _dao,
                _updateParams.plugin,
                _currentHelpers,
                oldVersion,
                _data
            );

        // Avoid stack too deep compiler error by putting the code into curly braces.
        {
            // add new helpers for the future update checks
            bytes32 newSetupId = _getSetupId(
                _dao,
                _updateParams.newPluginSetup,
                address(_updateParams.pluginSetupRepo),
                _updateParams.plugin
            );
            helpersHashes[newSetupId] = _getHelpersHash(updatedHelpers);

            // Set new update permission hashes.
            updatePermissionHashes[newSetupId] = _getPermissionsHash(permissions);
        }

        emit UpdatePrepared({
            sender: msg.sender,
            dao: _dao,
            pluginSetup: _updateParams.newPluginSetup,
            data: _data,
            plugin: _updateParams.plugin,
            updatedHelpers: updatedHelpers,
            permissions: permissions,
            initData: initData
        });

        return (permissions, initData);
    }

    /// @notice Applies the permissions of a prepared update of an UUPS upgradeable contract to a DAO.
    /// @param _dao The address of the updating DAO.
    /// @param _plugin The address of the `PluginUUPSUpgradeable` proxy contract.
    /// @param _pluginSetup The address of the `PluginSetup` contract.
    /// @param _pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param _initData The initialization data to be passed to the upgradeable plugin contract via `upgradeToAndCall`. // revisit
    /// @param _permissions The list of multi-targeted permission operations to apply to the updating DAO.
    function applyUpdate(
        address _dao,
        address _plugin,
        address _pluginSetup,
        PluginRepo _pluginSetupRepo,
        bytes memory _initData,
        PermissionLib.ItemMultiTarget[] calldata _permissions
    ) external canApply(_dao, APPLY_UPDATE_PERMISSION_ID) {
        bytes32 setupId = _getSetupId(_dao, _pluginSetup, address(_pluginSetupRepo), _plugin);

        if (updatePermissionHashes[setupId] != _getPermissionsHash(_permissions)) {
            revert PermissionsHashMismatch();
        }

        _upgradeProxy(_plugin, PluginSetup(_pluginSetup).getImplementationAddress(), _initData);

        DAO(payable(_dao)).bulkOnMultiTarget(_permissions);

        delete updatePermissionHashes[setupId];

        emit UpdateApplied({dao: _dao, plugin: _plugin});
    }

    /// @notice Prepares the uninstallation of a plugin.
    /// @param _dao The address of the installing DAO.
    /// @param _plugin The address of the `Plugin` contract.
    /// @param _pluginSetup The address of the `PluginSetup` contract.
    /// @param _pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param _currentHelpers The address array of all current helpers (contracts or EOAs) associated with the plugin that is prepared to be uninstalled.
    /// @param _data The `bytes` encoded data containing the input parameters for the uninstallation as specified in the `prepareUninstallationDataABI()` function in the `pluginSetup` setup contract.
    /// @return permissions The list of multi-targeted permission operations to be applied to the uninstalling DAO.
    /// @dev The list of `_currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the uninstallation was prepared for.
    function prepareUninstallation(
        address _dao,
        address _plugin,
        address _pluginSetup,
        PluginRepo _pluginSetupRepo,
        address[] calldata _currentHelpers,
        bytes calldata _data
    ) external returns (PermissionLib.ItemMultiTarget[] memory permissions) {
        // ensure repo for plugin manager exists
        if (!repoRegistry.entries(address(_pluginSetupRepo))) {
            revert EmptyPluginRepo();
        }

        // Reverts if pluginSetup doesn't exist on the repo...
        _pluginSetupRepo.getVersionByPluginSetup(_pluginSetup);

        // check if plugin is applied.
        bytes32 appliedId = _getAppliedId(_dao, _plugin);

        if (!isInstallationApplied[appliedId]) {
            revert SetupNotApplied();
        }

        permissions = PluginSetup(_pluginSetup).prepareUninstallation(
            _dao,
            _plugin,
            _currentHelpers,
            _data
        );

        bytes32 setupId = _getSetupId(_dao, _pluginSetup, address(_pluginSetupRepo), _plugin);

        // check helpers
        if (helpersHashes[setupId] != _getHelpersHash(_currentHelpers)) {
            revert HelpersHashMismatch();
        }

        // Check if this plugin uninstallation is already prepared
        if (uninstallPermissionHashes[setupId] != bytes32(0)) {
            revert SetupAlreadyPrepared();
        }

        // set permission hashes.
        uninstallPermissionHashes[setupId] = _getPermissionsHash(permissions);

        emit UninstallationPrepared({
            sender: msg.sender,
            dao: _dao,
            pluginSetup: _pluginSetup,
            data: _data,
            plugin: _plugin,
            currentHelpers: _currentHelpers,
            permissions: permissions
        });
    }

    /// @notice Applies the permissions of a prepared uninstallation to a DAO.
    /// @param _dao The address of the DAO.
    /// @param _pluginSetup The address of the `PluginSetup` contract.
    /// @param _pluginSetupRepo The repository storing the `PluginSetup` contracts of all versions of a plugin.
    /// @param _plugin The address of the `Plugin` contract.
    /// @param _currentHelpers The address array of all current helpers (contracts or EOAs) associated with the plugin that is uninstalled.
    /// @param _permissions The list of multi-targeted permission operations to apply to the uninstalling DAO.
    /// @dev The list of `_currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the uninstallation was prepared for.
    function applyUninstallation(
        address _dao,
        address _plugin,
        address _pluginSetup,
        PluginRepo _pluginSetupRepo,
        address[] calldata _currentHelpers, // TODO Isn't it sufficient to pass the helpers hash?
        PermissionLib.ItemMultiTarget[] calldata _permissions
    ) external canApply(_dao, APPLY_UNINSTALLATION_PERMISSION_ID) {
        bytes32 setupId = _getSetupId(_dao, _pluginSetup, address(_pluginSetupRepo), _plugin);

        if (helpersHashes[setupId] != _getHelpersHash(_currentHelpers)) {
            revert HelpersHashMismatch();
        }

        bytes32 storedPermissionsHash = uninstallPermissionHashes[setupId];
        bytes32 passedPermissionsHash = _getPermissionsHash(_permissions);

        // check that permissions weren't tempered.
        if (storedPermissionsHash != passedPermissionsHash) {
            revert PermissionsHashMismatch();
        }

        DAO(payable(_dao)).bulkOnMultiTarget(_permissions);

        delete helpersHashes[setupId];

        delete uninstallPermissionHashes[setupId];

        emit UninstallationApplied({dao: _dao, plugin: _plugin});
    }

    /// @notice Returns an identifier for applied installations by hashing the DAO and plugin address.
    /// @param _dao The address of the DAO conducting the setup.
    /// @param _plugin The address of the `Plugin` contract associated with the setup.
    function _getAppliedId(address _dao, address _plugin) private pure returns (bytes32 appliedId) {
        appliedId = keccak256(abi.encode(_dao, _plugin));
    }

    /// @notice Returns an identifier for prepared installations by hashing the DAO and plugin address.
    /// @param _dao The address of the DAO conducting the setup.
    /// @param _pluginSetup The address of the plugin setup.
    /// @param _pluginSetupRepo The address of plugin setup repo.
    /// @param _plugin The address of the `Plugin` contract associated with the setup.
    function _getSetupId(
        address _dao,
        address _pluginSetup,
        address _pluginSetupRepo,
        address _plugin
    ) private pure returns (bytes32 setupId) {
        setupId = keccak256(abi.encode(_dao, _pluginSetup, _pluginSetupRepo, _plugin));
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
                revert PluginNonupgradeable({plugin: _proxy});
            }
        } else {
            try PluginUUPSUpgradeable(_proxy).upgradeTo(_implementation) {} catch Error(
                string memory reason
            ) {
                revert(reason);
            } catch (
                bytes memory /*lowLevelData*/
            ) {
                revert PluginNonupgradeable({plugin: _proxy});
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
