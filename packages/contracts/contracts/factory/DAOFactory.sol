// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {DAORegistry} from "../registry/DAORegistry.sol";
import {DAO} from "../core/DAO.sol";
import {PermissionLib} from "../core/permission/PermissionLib.sol";
import {createProxy} from "../utils/Proxy.sol";
import {PluginRepo} from "../plugin/PluginRepo.sol";
import {PluginSetupProcessor} from "../plugin/PluginSetupProcessor.sol";

/// @title DAOFactory
/// @author Aragon Association - 2022
/// @notice This contract is used to create a DAO.
contract DAOFactory {
    address public daoBase;

    DAORegistry public daoRegistry;
    PluginSetupProcessor public pluginSetupProcessor;

    struct DAOSettings {
        address trustedForwarder;
        string name;
        bytes metadata;
    }

    struct PluginSettings {
        address pluginSetup;
        PluginRepo pluginSetupRepo;
        bytes data;
    }

    /// @notice Thrown if `PluginSettings` array is empty, and no plugin is provided.
    error NoPluginProvided();

    /// @notice The constructor setting the registry and token factory address and creating the base contracts for the factory to clone from.
    /// @param _registry The DAO registry to register the DAO by its name.
    /// @param _pluginSetupProcessor The addres of PluginSetupProcessor.
    constructor(DAORegistry _registry, PluginSetupProcessor _pluginSetupProcessor) {
        daoRegistry = _registry;
        pluginSetupProcessor = _pluginSetupProcessor;

        daoBase = address(new DAO());
    }

    function createDao(DAOSettings calldata _daoSettings, PluginSettings[] calldata pluginSettings)
        external
        returns (DAO dao)
    {
        // Check if no plugin is provided.
        if (pluginSettings.length == 0) {
            revert NoPluginProvided();
        }

        // Create DAO.
        dao = _createDAO(_daoSettings);

        // Register DAO.
        daoRegistry.register(dao, msg.sender, _daoSettings.name);

        // Grant the temporary permissions.
        // Grant Temporarly `ROOT_PERMISSION` to `pluginSetupProcessor`.
        dao.grant(address(dao), address(pluginSetupProcessor), dao.ROOT_PERMISSION_ID());

        // Grant Temporarly `APPLY_INSTALLATION_PERMISSION` on `pluginSetupProcessor` to this `DAOFactory`.
        dao.grant(
            address(pluginSetupProcessor),
            address(this),
            pluginSetupProcessor.APPLY_INSTALLATION_PERMISSION_ID()
        );

        // Install plugins on the newly created DAO.
        for (uint256 i = 0; i < pluginSettings.length; i++) {
            // Prepare plugin.
            (
                address plugin,
                ,
                PermissionLib.ItemMultiTarget[] memory permissions
            ) = pluginSetupProcessor.prepareInstallation(
                    address(dao),
                    pluginSettings[i].pluginSetup,
                    pluginSettings[i].pluginSetupRepo,
                    pluginSettings[i].data
                );

            // Apply plugin.
            pluginSetupProcessor.applyInstallation(
                address(dao),
                pluginSettings[i].pluginSetup,
                plugin,
                permissions
            );
        }

        // Set the rest of DAO's permissions.
        _setDAOPermissions(dao);

        // Revoke the temporarly granted permissions.
        // Revoke Temporarly `ROOT_PERMISSION` from `pluginSetupProcessor`.
        dao.revoke(address(dao), address(pluginSetupProcessor), dao.ROOT_PERMISSION_ID());

        // Revoke `APPLY_INSTALLATION_PERMISSION` on `pluginSetupProcessor` from this `DAOFactory` .
        dao.revoke(
            address(pluginSetupProcessor),
            address(this),
            pluginSetupProcessor.APPLY_INSTALLATION_PERMISSION_ID()
        );

        // Revoke Temporarly `ROOT_PERMISSION_ID` from `pluginSetupProcessor` that implecitly granted to this `DaoFactory`
        // at the create dao step `address(this)` being the initial owner of the new created DAO.
        dao.revoke(address(dao), address(this), dao.ROOT_PERMISSION_ID());
    }

    /// @notice Creates a new DAO.
    /// @param _daoSettings The name and metadata hash of the DAO it creates.
    function _createDAO(DAOSettings calldata _daoSettings) internal returns (DAO dao) {
        // create dao
        dao = DAO(createProxy(daoBase, bytes("")));

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
            _dao.UPGRADE_PERMISSION_ID()
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
