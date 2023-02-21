// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {DAO} from "../../core/dao/DAO.sol";
import {PermissionLib} from "../../core/permission/PermissionLib.sol";
import {createERC1967Proxy} from "../../utils/Proxy.sol";
import {PluginRepo} from "../plugin/repo/PluginRepo.sol";
import {PluginSetupProcessor} from "../plugin/setup/PluginSetupProcessor.sol";
import {hashHelpers, PluginSetupRef} from "../plugin/setup/PluginSetupProcessorHelpers.sol";
import {IPluginSetup} from "../plugin/setup/IPluginSetup.sol";
import {DAORegistry} from "./DAORegistry.sol";

/// @title DAOFactory
/// @author Aragon Association - 2022-2023
/// @notice This contract is used to create a DAO.
contract DAOFactory {
    /// @notice The DAO base contract, to be used for creating new `DAO`s via `createERC1967Proxy` function.
    address public immutable daoBase;

    /// @notice The DAO registry listing the `DAO` contracts created via this contract.
    DAORegistry public immutable daoRegistry;

    /// @notice The plugin setup processor for installing plugins on the newly created `DAO`s.
    PluginSetupProcessor public immutable pluginSetupProcessor;

    /// @notice The container for the DAO settings to be set during the DAO initialization.
    /// @param trustedForwarder The address of the trusted forwarder required for meta transactions.
    /// @param daoURI The DAO uri used with [EIP-4824](https://eips.ethereum.org/EIPS/eip-4824).
    /// @param subdomain The ENS subdomain to be registered for the DAO contract.
    /// @param metadata The metadata of the DAO.
    struct DAOSettings {
        address trustedForwarder;
        string daoURI;
        string subdomain;
        bytes metadata;
    }

    /// @notice The container with the information required to install a plugin on the DAO.
    /// @param pluginSetupRef The `PluginSetupRepo` address of the plugin and the version tag.
    /// @param data The bytes-encoded data containing the input parameters for the installation as specified in the plugin's build metadata JSON file.
    struct PluginSettings {
        PluginSetupRef pluginSetupRef;
        bytes data;
    }

    /// @notice Thrown if `PluginSettings` array is empty, and no plugin is provided.
    error NoPluginProvided();

    /// @notice The constructor setting the registry and plugin setup processor and creating the base contracts for the factory.
    /// @param _registry The DAO registry to register the DAO by its name.
    /// @param _pluginSetupProcessor The address of PluginSetupProcessor.
    constructor(DAORegistry _registry, PluginSetupProcessor _pluginSetupProcessor) {
        daoRegistry = _registry;
        pluginSetupProcessor = _pluginSetupProcessor;

        daoBase = address(new DAO());
    }

    /// @notice Creates a new DAO, registers it on the  DAO registry, and installs a list of plugins via the plugin setup processor.
    /// @param _daoSettings The DAO settings to be set during the DAO initialization.
    /// @param _pluginSettings The array containing references to plugins and their settings to be installed after the DAO has been created.
    function createDao(
        DAOSettings calldata _daoSettings,
        PluginSettings[] calldata _pluginSettings
    ) external returns (DAO createdDao) {
        // Check if no plugin is provided.
        if (_pluginSettings.length == 0) {
            revert NoPluginProvided();
        }

        // Create DAO.
        createdDao = _createDAO(_daoSettings);

        // Register DAO.
        daoRegistry.register(createdDao, msg.sender, _daoSettings.subdomain);

        // Get Permission IDs
        bytes32 rootPermissionID = createdDao.ROOT_PERMISSION_ID();
        bytes32 applyInstallationPermissionID = pluginSetupProcessor
            .APPLY_INSTALLATION_PERMISSION_ID();

        // Grant the temporary permissions.
        // Grant Temporarly `ROOT_PERMISSION` to `pluginSetupProcessor`.
        createdDao.grant(address(createdDao), address(pluginSetupProcessor), rootPermissionID);

        // Grant Temporarly `APPLY_INSTALLATION_PERMISSION` on `pluginSetupProcessor` to this `DAOFactory`.
        createdDao.grant(
            address(pluginSetupProcessor),
            address(this),
            applyInstallationPermissionID
        );

        // Install plugins on the newly created DAO.
        for (uint256 i; i < _pluginSettings.length; ++i) {
            // Prepare plugin.
            (
                address plugin,
                IPluginSetup.PreparedSetupData memory preparedSetupData
            ) = pluginSetupProcessor.prepareInstallation(
                    address(createdDao),
                    PluginSetupProcessor.PrepareInstallationParams(
                        _pluginSettings[i].pluginSetupRef,
                        _pluginSettings[i].data
                    )
                );

            // Apply plugin.
            pluginSetupProcessor.applyInstallation(
                address(createdDao),
                PluginSetupProcessor.ApplyInstallationParams(
                    _pluginSettings[i].pluginSetupRef,
                    plugin,
                    preparedSetupData.permissions,
                    hashHelpers(preparedSetupData.helpers)
                )
            );
        }

        // Set the rest of DAO's permissions.
        _setDAOPermissions(createdDao);

        // Revoke the temporarly granted permissions.
        // Revoke Temporarly `ROOT_PERMISSION` from `pluginSetupProcessor`.
        createdDao.revoke(address(createdDao), address(pluginSetupProcessor), rootPermissionID);

        // Revoke `APPLY_INSTALLATION_PERMISSION` on `pluginSetupProcessor` from this `DAOFactory` .
        createdDao.revoke(
            address(pluginSetupProcessor),
            address(this),
            applyInstallationPermissionID
        );

        // Revoke Temporarly `ROOT_PERMISSION_ID` from `pluginSetupProcessor` that implecitly granted to this `DaoFactory`
        // at the create dao step `address(this)` being the initial owner of the new created DAO.
        createdDao.revoke(address(createdDao), address(this), rootPermissionID);
    }

    /// @notice Deploys a new DAO `ERC1967` proxy, and initialize it with this contract as the intial owner.
    /// @param _daoSettings The trusted forwarder, name and metadata hash of the DAO it creates.
    function _createDAO(DAOSettings calldata _daoSettings) internal returns (DAO dao) {
        // create dao
        dao = DAO(payable(createERC1967Proxy(daoBase, bytes(""))));

        // initialize the DAO and give the `ROOT_PERMISSION_ID` permission to this contract.
        dao.initialize(
            _daoSettings.metadata,
            address(this),
            _daoSettings.trustedForwarder,
            _daoSettings.daoURI
        );
    }

    /// @notice Sets the required permissions for the new DAO.
    /// @param _dao The DAO instance just created.
    function _setDAOPermissions(DAO _dao) internal {
        // set permissionIds on the dao itself.
        PermissionLib.SingleTargetPermission[]
            memory items = new PermissionLib.SingleTargetPermission[](6);

        // Grant DAO all the permissions required
        items[0] = PermissionLib.SingleTargetPermission(
            PermissionLib.Operation.Grant,
            address(_dao),
            _dao.ROOT_PERMISSION_ID()
        );
        items[1] = PermissionLib.SingleTargetPermission(
            PermissionLib.Operation.Grant,
            address(_dao),
            _dao.UPGRADE_DAO_PERMISSION_ID()
        );
        items[2] = PermissionLib.SingleTargetPermission(
            PermissionLib.Operation.Grant,
            address(_dao),
            _dao.SET_SIGNATURE_VALIDATOR_PERMISSION_ID()
        );
        items[3] = PermissionLib.SingleTargetPermission(
            PermissionLib.Operation.Grant,
            address(_dao),
            _dao.SET_TRUSTED_FORWARDER_PERMISSION_ID()
        );
        items[4] = PermissionLib.SingleTargetPermission(
            PermissionLib.Operation.Grant,
            address(_dao),
            _dao.SET_METADATA_PERMISSION_ID()
        );
        items[5] = PermissionLib.SingleTargetPermission(
            PermissionLib.Operation.Grant,
            address(_dao),
            _dao.REGISTER_STANDARD_CALLBACK_PERMISSION_ID()
        );

        _dao.applySingleTargetPermissions(address(_dao), items);
    }
}
