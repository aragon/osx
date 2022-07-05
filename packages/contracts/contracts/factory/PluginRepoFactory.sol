/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "../utils/Proxy.sol";
import "../registry/AragonPluginRegistry.sol";
import "../plugin/PluginRepo.sol";

/// @title PluginRepoFactory to create a PluginRepo
/// @author Aragon Association - 2022
/// @notice This contract is used to create a PluginRepo and register it on AragonPluginRegistry contract.
contract PluginRepoFactory {
    AragonPluginRegistry public aragonPluginRegistry;
    address public pluginRepoBase;

    // @notice Thrown if the repo name is empty
    error EmptyName();

    constructor(AragonPluginRegistry _aragonPluginRegistry) {
        aragonPluginRegistry = _aragonPluginRegistry;

        pluginRepoBase = address(new PluginRepo());
    }

    /// @notice Create new pluginRepo in registry with `_name`
    /// @param _name PluginRepo name, must be ununsed
    /// @param _dev Address of the developer of the plugin
    /// TODO: Rethink if it need permission to prevent it from getting poluted, same for newPluginRepoWithVersion
    function newPluginRepo(string calldata _name, address _dev) external returns (PluginRepo) {
        return _newPluginRepo(_name, _dev);
    }

    /// @notice Creates and registers a new, named `PluginRepo` and publishes an initial version with contract
    /// @dev Initial owner of the new PluginRepo is `address(this)`, afterward ownership will be transfered to the `_dev`
    /// @param _name PluginRepo name
    /// @param _initialSemanticVersion Semantic version for new pluginRepo version
    /// @param _pluginFactoryAddress address for the factory smart contract of the version
    /// @param _contentURI External URI for fetching new version's content
    /// @param _dev Address of the developer of the plugin
    function newPluginRepoWithVersion(
        string calldata _name,
        uint16[3] memory _initialSemanticVersion,
        address _pluginFactoryAddress,
        bytes memory _contentURI,
        address _dev
    ) external returns (PluginRepo pluginRepo) {
        pluginRepo = _newPluginRepo(_name, address(this)); // Set `address(this)` as initial owner
        pluginRepo.newVersion(_initialSemanticVersion, _pluginFactoryAddress, _contentURI);

        // Setup permissions and transfer ownership to `_dev`
        setPluginRepoPermissions(pluginRepo, _dev);
    }

    /// @dev Does set the required permissions for the new PluginRepo.
    /// @param pluginRepo The PluginRepo instance just created.
    /// @param dev Address of the developer
    function setPluginRepoPermissions(PluginRepo pluginRepo, address dev) internal {
        // set permissionIDs on the dao itself.
        ACLData.BulkItem[] memory items = new ACLData.BulkItem[](5);

        // Grant DAO all the permissions required
        items[0] = ACLData.BulkItem(
            ACLData.BulkOp.Grant,
            pluginRepo.CREATE_VERSION_PERMISSION_ID(),
            dev
        );
        items[1] = ACLData.BulkItem(ACLData.BulkOp.Grant, pluginRepo.UPGRADE_PERMISSION_ID(), dev);
        items[2] = ACLData.BulkItem(ACLData.BulkOp.Grant, pluginRepo.ROOT_PERMISSION_ID(), dev);

        // Revoke permissions from APM
        items[3] = ACLData.BulkItem(
            ACLData.BulkOp.Revoke,
            pluginRepo.ROOT_PERMISSION_ID(),
            address(this)
        );
        items[4] = ACLData.BulkItem(
            ACLData.BulkOp.Revoke,
            pluginRepo.CREATE_VERSION_PERMISSION_ID(),
            address(this)
        );

        pluginRepo.bulk(address(pluginRepo), items);
    }

    /// @dev Does set the required permissions for the new PluginRepo.
    /// @param _name The PluginRepo instance just created.
    /// @param _initialOwner The initial owner address
    function _newPluginRepo(string calldata _name, address _initialOwner)
        internal
        returns (PluginRepo pluginRepo)
    {
        if (!(bytes(_name).length > 0)) revert EmptyName();

        pluginRepo = PluginRepo(
            createProxy(
                pluginRepoBase,
                abi.encodeWithSelector(PluginRepo.initialize.selector, _initialOwner)
            )
        );

        aragonPluginRegistry.register(_name, address(pluginRepo));
    }
}
