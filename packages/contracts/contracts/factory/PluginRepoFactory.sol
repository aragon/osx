/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "../utils/Proxy.sol";
import "../registry/AragonPluginRegistry.sol";
import { PluginRepo } from  "../plugin/PluginRepo.sol";
import { BulkPermissionsLib } from '../core/permission/BulkPermissionsLib.sol';

/// @title PluginRepoFactory
/// @author Aragon Association - 2022
/// @notice This contract creates `PluginRepo` proxies and registers them on an `AragonPluginRegistry` contract.
contract PluginRepoFactory {
    /// @notice The Aragon plugin registry contract.
    AragonPluginRegistry public aragonPluginRegistry;

    /// @notice The address of the `PluginRepo` base contract.
    address public pluginRepoBase;

    // @notice Thrown if the plugin repository name is empty.
    error EmptyPluginRepoName();

    /// @notice Initializes the addresses of the Aragon plugin registry and `PluginRepo` base contract to proxy to.
    /// @param _aragonPluginRegistry The aragon plugin registry address.
    constructor(AragonPluginRegistry _aragonPluginRegistry) {
        aragonPluginRegistry = _aragonPluginRegistry;

        pluginRepoBase = address(new PluginRepo());
    }

    /// @notice Creates a plugin repository proxy pointing to the `pluginRepoBase` implementation and registers it in the Aragon plugin registry.
    /// @param _name The plugin repository name.
    /// @param _initialOwner The plugin maintainer address.
    /// TODO: Rethink if it need permission to prevent it from getting poluted, same for `createPluginRepoWithVersion`.
    function createPluginRepo(string calldata _name, address _initialOwner)
        external
        returns (PluginRepo)
    {
        return _createPluginRepo(_name, _initialOwner);
    }

    /// @notice Creates and registers a named `PluginRepo` and publishes an initial version.
    /// @dev The initial owner of the new PluginRepo is `address(this)`, afterward ownership will be transfered to the address `_maintainer`.
    /// @param _name The plugin repository name.
    /// @param _initialSemanticVersion The semantic version for the new plugin repository version.
    /// @param _pluginManager The plugin factory contract associated with the plugin version.
    /// @param _contentURI The external URI for fetching the new version's content.
    /// @param _maintainer The plugin maintainer address.
    function createPluginRepoWithVersion(
        string calldata _name,
        uint16[3] memory _initialSemanticVersion,
        address _pluginManager,
        bytes memory _contentURI,
        address _maintainer
    ) external returns (PluginRepo pluginRepo) {
        // Sets `address(this)` as initial owner which is later replaced with the maintainer address.
        pluginRepo = _createPluginRepo(_name, address(this));

        pluginRepo.createVersion(_initialSemanticVersion, _pluginManager, _contentURI);

        // Setup permissions and transfer ownership from `address(this)` to `_maintainer`.
        setPluginRepoPermissions(pluginRepo, _maintainer);
    }

    /// @notice Set the final permissions for the published plugin repository maintainer. All permissions are revoked from the the plugin factory and granted to the specified plugin maintainer.
    /// @param pluginRepo The plugin repository instance just created.
    /// @param maintainer The plugin maintainer address.
    /// @dev The plugin maintainer is granted the `CREATE_VERSION_PERMISSION_ID`, `UPGRADE_PERMISSION_ID`, and `ROOT_PERMISSION_ID`.
    function setPluginRepoPermissions(PluginRepo pluginRepo, address maintainer) internal {
        // Set permissions on the `PluginRepo`s `PermissionManager`
        BulkPermissionsLib.ItemSingleTarget[] memory items = new BulkPermissionsLib.ItemSingleTarget[](5);

        // Grant the plugin maintainer all the permissions required
        items[0] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            maintainer,
            pluginRepo.CREATE_VERSION_PERMISSION_ID()
        );
        items[1] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            maintainer,
            pluginRepo.UPGRADE_PERMISSION_ID()
        );
        items[2] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Grant,
            maintainer,
            pluginRepo.ROOT_PERMISSION_ID()
        );

        // Revoke permissions from the plugin repository factory (`address(this)`).
        items[3] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Revoke,
            address(this),
            pluginRepo.ROOT_PERMISSION_ID()
        );
        items[4] = BulkPermissionsLib.ItemSingleTarget(
            BulkPermissionsLib.Operation.Revoke,
            address(this),
            pluginRepo.CREATE_VERSION_PERMISSION_ID()
        );

        pluginRepo.bulkOnSingleTarget(address(pluginRepo), items);
    }

    /// @notice Internal method creating a `PluginRepo` via the [ERC-1967](https://eips.ethereum.org/EIPS/eip-1967) proxy pattern from the provided base contract and registering it in the Aragon plugin registry.
    /// @param _name The plugin repository name.
    /// @param _initialOwner The initial owner address.
    function _createPluginRepo(string calldata _name, address _initialOwner)
        internal
        returns (PluginRepo pluginRepo)
    {
        if (!(bytes(_name).length > 0)) {
            revert EmptyPluginRepoName();
        }

        pluginRepo = PluginRepo(
            createProxy(
                pluginRepoBase,
                abi.encodeWithSelector(PluginRepo.initialize.selector, _initialOwner)
            )
        );

        aragonPluginRegistry.register(_name, address(pluginRepo));
    }
}
