// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {DAORegistry} from "../registry/DAORegistry.sol";
import {DAO} from "../core/DAO.sol";
import {BulkPermissionsLib} from "../core/permission/BulkPermissionsLib.sol";
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
        string name;
        address trustedForwarder;
        bytes metadata;
    }

    struct PluginSettings {
        address pluginSetup;
        PluginRepo pluginSetupRepo;
        bytes data;
    }

    /// @notice Thrown if `PluginSettings` array is empty.
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
    {
        // Check if plugin is provided
        if (pluginSettings.length == 0) {
            revert NoPluginProvided();
        }

        // Create DAO
        DAO dao = _createDAO(_daoSettings);

        // Register DAO
        daoRegistry.register(dao, msg.sender, _daoSettings.name);

        // Grant `ROOT_PERMISSION_ID` to `pluginSetupProcessor`.
        dao.grant(address(dao), address(pluginSetupProcessor), dao.ROOT_PERMISSION_ID());

        for (uint256 i = 0; i < pluginSettings.length; i++) {
            // Prepare plugin.
            (
                address plugin,
                ,
                BulkPermissionsLib.ItemMultiTarget[] memory permissions
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

        // set the rest of DAO's permissions
        _setDAOPermissions(dao);
    }

    /// @notice Creates a new DAO.
    /// @param _daoSettings The name and metadata hash of the DAO it creates.
    function _createDAO(DAOSettings calldata _daoSettings) internal returns (DAO dao) {
        // create dao
        dao = DAO(createProxy(daoBase, bytes("")));

        // initialize dao with the `ROOT_PERMISSION_ID` permission as DAOFactory
        dao.initialize(_daoSettings.metadata, address(this), _daoSettings.trustedForwarder);
    }

    /// @notice Sets the required permissions for the new DAO.
    /// @param _dao The DAO instance just created.
    function _setDAOPermissions(DAO _dao) internal {
        // set permissionIds on the dao itself.
        BulkPermissionsLib.ItemSingleTarget[]
            memory items = new BulkPermissionsLib.ItemSingleTarget[](8);

        // Grant DAO all the permissions required
        items[0] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.SET_METADATA_PERMISSION_ID()
        );
        items[1] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.WITHDRAW_PERMISSION_ID()
        );
        items[2] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.UPGRADE_PERMISSION_ID()
        );
        items[3] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.ROOT_PERMISSION_ID()
        );
        items[4] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.SET_SIGNATURE_VALIDATOR_PERMISSION_ID()
        );
        items[5] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            address(_dao),
            _dao.SET_TRUSTED_FORWARDER_PERMISSION_ID()
        );

        // Revoke permissions from `pluginSetupProcessor`
        items[6] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Revoke,
            address(pluginSetupProcessor),
            _dao.ROOT_PERMISSION_ID()
        );

        // Revoke permissions from this factory
        items[7] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Revoke,
            address(this),
            _dao.ROOT_PERMISSION_ID()
        );

        _dao.bulkOnSingleTarget(address(_dao), items);
    }
}
