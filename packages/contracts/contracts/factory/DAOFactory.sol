// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {DAORegistry} from "../registry/DAORegistry.sol";
import {DAO} from "../core/DAO.sol";
import {PermissionLib} from "../core/permission/PermissionLib.sol";
import {createERC1967Proxy} from "../utils/Proxy.sol";
import {PluginRepo} from "../plugin/PluginRepo.sol";
import {PluginSetupProcessor} from "../plugin/psp/PluginSetupProcessor.sol";
import {hHash, PluginSetupRef} from "../plugin/psp/utils/Common.sol";
import {IPluginSetup} from "../plugin/psp/PluginSetupProcessor.sol";

/// @title DAOFactory
/// @author Aragon Association - 2022
/// @notice This contract is used to create a DAO.
contract DAOFactory {
    /// @notice The DAO base contract, to be used for creating new `DAO`s via `createERC1967Proxy` function.
    address public immutable daoBase;

    /// @notice The DAO registry listing the `DAO` contracts created via this contract.
    DAORegistry public immutable daoRegistry;

    /// @notice The plugin setup processor for installing plugins on the newly created `DAO`s.
    PluginSetupProcessor public immutable pluginSetupProcessor;

    struct DAOSettings {
        address trustedForwarder; // The address of the trusted forwarder required for meta transactions.
        string name; // The name of the DAO.
        bytes metadata; // Meta data of the DAO.
    }

    struct PluginSettings {
        PluginSetupRef pluginSetupRef; // The `PluginSetupRepo` address of the plugin and the version tag.
        bytes data; // The `bytes` encoded data containing the input parameters for the installation as specified in the `prepareInstallationDataABI()` function.
    }

    /// @notice Thrown if `PluginSettings` array is empty, and no plugin is provided.
    error NoPluginProvided();

    /// @notice The constructor setting the registry and plugin setup processor and creating the base contracts for the factory.
    /// @param _registry The DAO registry to register the DAO by its name.
    /// @param _pluginSetupProcessor The addres of PluginSetupProcessor.
    constructor(DAORegistry _registry, PluginSetupProcessor _pluginSetupProcessor) {
        daoRegistry = _registry;
        pluginSetupProcessor = _pluginSetupProcessor;

        daoBase = address(new DAO());
    }

    /// @notice Creates a new DAO and setup a number of plugins.
    /// @param _daoSettings The DAO settings containing `trustedForwarder`, `name` and `metadata`.
    /// @param _pluginSettings The list of plugin settings that will be installed after the DAO creation, containing `pluginSetup`, `pluginSetupRepo`, and `data`.
    function createDao(DAOSettings calldata _daoSettings, PluginSettings[] calldata _pluginSettings)
        external
        returns (DAO createdDao)
    {
        // Check if no plugin is provided.
        if (_pluginSettings.length == 0) {
            revert NoPluginProvided();
        }

        // Create DAO.
        createdDao = _createDAO(_daoSettings);

        // Register DAO.
        daoRegistry.register(createdDao, msg.sender, _daoSettings.name);

        // Grant the temporary permissions.
        // Grant Temporarly `ROOT_PERMISSION` to `pluginSetupProcessor`.
        createdDao.grant(
            address(createdDao),
            address(pluginSetupProcessor),
            createdDao.ROOT_PERMISSION_ID()
        );

        // Grant Temporarly `APPLY_INSTALLATION_PERMISSION` on `pluginSetupProcessor` to this `DAOFactory`.
        createdDao.grant(
            address(pluginSetupProcessor),
            address(this),
            pluginSetupProcessor.APPLY_INSTALLATION_PERMISSION_ID()
        );

        // Install plugins on the newly created DAO.
        for (uint256 i = 0; i < _pluginSettings.length; i++) {
            // Prepare plugin.
            (
                address plugin,
                IPluginSetup.PreparedDependency memory preparedDependency
            ) = pluginSetupProcessor.prepareInstallation(
                    address(createdDao),
                    PluginSetupProcessor.PrepareInstall(
                        _pluginSettings[i].pluginSetupRef,
                        _pluginSettings[i].data
                    )
                );

            // Apply plugin.
            pluginSetupProcessor.applyInstallation(
                address(createdDao),
                PluginSetupProcessor.ApplyInstall(
                    _pluginSettings[i].pluginSetupRef,
                    plugin,
                    preparedDependency.permissions,
                    hHash(preparedDependency.helpers)
                )
            );
        }

        // Set the rest of DAO's permissions.
        _setDAOPermissions(createdDao);

        // Revoke the temporarly granted permissions.
        // Revoke Temporarly `ROOT_PERMISSION` from `pluginSetupProcessor`.
        createdDao.revoke(
            address(createdDao),
            address(pluginSetupProcessor),
            createdDao.ROOT_PERMISSION_ID()
        );

        // Revoke `APPLY_INSTALLATION_PERMISSION` on `pluginSetupProcessor` from this `DAOFactory` .
        createdDao.revoke(
            address(pluginSetupProcessor),
            address(this),
            pluginSetupProcessor.APPLY_INSTALLATION_PERMISSION_ID()
        );

        // Revoke Temporarly `ROOT_PERMISSION_ID` from `pluginSetupProcessor` that implecitly granted to this `DaoFactory`
        // at the create dao step `address(this)` being the initial owner of the new created DAO.
        createdDao.revoke(address(createdDao), address(this), createdDao.ROOT_PERMISSION_ID());
    }

    /// @notice Creates a new DAO, and initialize it with this contract as intial owner.
    /// @param _daoSettings The trusted forwarder, name and metadata hash of the DAO it creates.
    function _createDAO(DAOSettings calldata _daoSettings) internal returns (DAO dao) {
        // create dao
        dao = DAO(payable(createERC1967Proxy(daoBase, bytes(""))));

        // initialize dao with the `ROOT_PERMISSION_ID` permission as DAOFactory.
        dao.initialize(_daoSettings.metadata, address(this), _daoSettings.trustedForwarder);
    }

    /// @notice Sets the required permissions for the new DAO.
    /// @param _dao The DAO instance just created.
    function _setDAOPermissions(DAO _dao) internal {
        // set permissionIds on the dao itself.
        PermissionLib.ItemSingleTarget[] memory items = new PermissionLib.ItemSingleTarget[](6);

        // Grant DAO all the permissions required
        items[0] = PermissionLib.ItemSingleTarget(
            PermissionLib.Operation.Grant,
            address(_dao),
            _dao.ROOT_PERMISSION_ID()
        );
        items[1] = PermissionLib.ItemSingleTarget(
            PermissionLib.Operation.Grant,
            address(_dao),
            _dao.WITHDRAW_PERMISSION_ID()
        );
        items[2] = PermissionLib.ItemSingleTarget(
            PermissionLib.Operation.Grant,
            address(_dao),
            _dao.UPGRADE_DAO_PERMISSION_ID()
        );
        items[3] = PermissionLib.ItemSingleTarget(
            PermissionLib.Operation.Grant,
            address(_dao),
            _dao.SET_SIGNATURE_VALIDATOR_PERMISSION_ID()
        );
        items[4] = PermissionLib.ItemSingleTarget(
            PermissionLib.Operation.Grant,
            address(_dao),
            _dao.SET_TRUSTED_FORWARDER_PERMISSION_ID()
        );
        items[5] = PermissionLib.ItemSingleTarget(
            PermissionLib.Operation.Grant,
            address(_dao),
            _dao.SET_METADATA_PERMISSION_ID()
        );

        _dao.bulkOnSingleTarget(address(_dao), items);
    }
}
