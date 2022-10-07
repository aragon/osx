// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {PluginUUPSUpgradeable} from "../core/plugin/PluginUUPSUpgradeable.sol";
import {DaoAuthorizable} from "../core/component/DaoAuthorizable.sol";
import {DAO, IDAO} from "../core/DAO.sol";

import {PluginERC1967Proxy} from "../utils/PluginERC1967Proxy.sol";
import {AragonPluginRegistry} from "../registry/AragonPluginRegistry.sol";

import {BulkPermissionsLib as Permission} from "../core/permission/BulkPermissionsLib.sol";
import {PluginSetup} from "./PluginSetup.sol";
import {PluginRepo} from "./PluginRepo.sol";

/// @notice Plugin setup processor that has root permissions to setup plugin on the dao and apply permissions.
contract PluginSetupProcessor is DaoAuthorizable {
    using ERC165Checker for address;

    bytes32 public constant PROCESS_INSTALL_PERMISSION_ID = keccak256("PROCESS_INSTALL_PERMISSION");
    bytes32 public constant PROCESS_UPDATE_PERMISSION_ID = keccak256("PROCESS_UPDATE_PERMISSION");
    bytes32 public constant PROCESS_UNINSTALL_PERMISSION_ID =
        keccak256("PROCESS_UNINSTALL_PERMISSION");
    bytes32 public constant SET_REPO_REGISTRY_PERMISSION_ID =
        keccak256("SET_REPO_REGISTRY_PERMISSION");

    struct PluginInstallParams {
        address plugin;
        address pluginSetup;
        address[] helpers;
        Permission.ItemMultiTarget[] permissions;
    }

    struct PluginUpdateParams {
        address plugin; // proxy contract
        address oldPluginSetup; // old plugin manager upgrade happens to.
        address newPluginSetup; // new plugin manager upgrade happens to.
        Permission.ItemMultiTarget[] permissions;
        address[] oldHelpers;
        address[] newHelpers;
        bytes initData;
    }

    struct PluginUninstallParams {
        address plugin;
        address pluginSetup;
        PluginRepo pluginSetupRepo;
        address[] helpers;
        Permission.ItemMultiTarget[] permissions;
    }

    mapping(bytes32 => bool) private isInstallationApplied;
    mapping(bytes32 => bytes32) private permissionHashes;
    mapping(bytes32 => bytes32) private updatePermissionHashes;
    mapping(bytes32 => bytes32) private uninstallPermissionHashes;
    mapping(bytes32 => bytes32) private helpersHashes;

    AragonPluginRegistry public repoRegistry;

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

    constructor(IDAO _dao, AragonPluginRegistry _repoRegistry) DaoAuthorizable(_dao) {
        repoRegistry = _repoRegistry;
    }

    function setRepoRegistry(AragonPluginRegistry _repoRegistry)
        external
        auth(SET_REPO_REGISTRY_PERMISSION_ID)
    {
        repoRegistry = _repoRegistry;
    }

    function applyInstallation(address _dao, PluginInstallParams calldata _params)
        external
        canApply(_dao, PROCESS_INSTALL_PERMISSION_ID)
    {
        bytes32 appliedId = getAppliedId(_dao, _params.plugin);
        bytes32 setupId = getSetupId(_dao, _params.pluginSetup, _params.plugin);

        if (isInstallationApplied[appliedId]) {
            revert PluginAlreadyApplied();
        }

        // set helpers hashes
        helpersHashes[setupId] = getHelpersHash(_params.helpers);

        // set install permission hashes
        permissionHashes[setupId] = getPermissionsHash(_params.permissions);

        // set is installation processed
        isInstallationApplied[appliedId] = true;

        // apply permissions on a dao..
        DAO(payable(_dao)).bulkOnMultiTarget(_params.permissions);

        // emit the event to connect plugin to the dao.
        emit InstallationApplied(_dao, _params.plugin);
    }

    function applyUpdate(address _dao, PluginUpdateParams calldata _params)
        external
        canApply(_dao, PROCESS_UPDATE_PERMISSION_ID)
    {
        bytes32 oldSetupId = getSetupId(_dao, _params.oldPluginSetup, _params.plugin);
        bytes32 newSetupId = getSetupId(_dao, _params.newPluginSetup, _params.plugin);
        bytes32 appliedId = getAppliedId(_dao, _params.plugin);

        if (!isInstallationApplied[appliedId]) {
            revert PluginNotApplied();
        }

        // Check old helpers and set new helpers
        bytes32 oldHelperHashes = getHelpersHash(_params.oldHelpers);
        bytes32 newHelperHashes = getHelpersHash(_params.newHelpers);

        if (helpersHashes[oldSetupId] != oldHelperHashes) {
            revert HelpersMismatch();
        }

        // update helpersHashes
        delete helpersHashes[oldSetupId];
        helpersHashes[newSetupId] = newHelperHashes;

        // Check old permissions and set new permissions
        bytes32 newPermissionHashes = getPermissionsHash(_params.permissions);
        bytes32 emptyPermissionsHashes = getPermissionsHash(new Permission.ItemMultiTarget[](0));

        if (
            permissionHashes[oldSetupId] == newPermissionHashes &&
            newPermissionHashes != emptyPermissionsHashes
        ) {
            revert UpdatePermissionsMismatch();
        }

        if (newPermissionHashes != emptyPermissionsHashes) {
            // set new permission hahses
            permissionHashes[newSetupId] = newPermissionHashes;
        } else {
            // set old permission hashes as new
            permissionHashes[newSetupId] = permissionHashes[oldSetupId];
        }
        // delete old permission hashes
        delete permissionHashes[oldSetupId];

        upgradeProxy(
            _params.plugin,
            PluginSetup(_params.newPluginSetup).getImplementationAddress(),
            _params.initData
        );

        DAO(payable(_dao)).bulkOnMultiTarget(_params.permissions);

        emit UpdateApplied(_dao, _params.plugin); // TODO: some other parts might be needed..
    }

    function applyUninstallation(address _dao, PluginUninstallParams calldata _params)
        external
        canApply(_dao, PROCESS_UNINSTALL_PERMISSION_ID)
    {
        bytes32 setupId = getSetupId(_dao, _params.pluginSetup, _params.plugin);
        bytes32 appliedId = getAppliedId(_dao, _params.plugin);

        if (!isInstallationApplied[appliedId]) {
            revert PluginNotApplied();
        }

        if (helpersHashes[setupId] != getHelpersHash(_params.helpers)) {
            revert HelpersMismatch();
        }

        DAO(payable(_dao)).bulkOnMultiTarget(_params.permissions);

        delete helpersHashes[setupId];

        delete permissionHashes[setupId];

        // TODO: create an enum for applied id, so it allowes uninstalled to be re-applied

        emit UninstallationApplied(_dao, _params.plugin, _params.helpers);
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
