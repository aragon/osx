---
title: Publishing a Plugin
---

## Start publishing your Plugin by creating a PluginRepo

To be available for installation in the Aragon OSx framework, a `PluginRepo` must be created for each plugin. The `PluginRepo` creation process is handled by:

- The [`PluginRepoFactory`](../../../../03-reference-guide/framework/plugin/repo/PluginRepoFactory.md): who creates the `PluginRepo` instance for each plugin to hold all plugin versions
- The [`PluginRepoRegistry`](../../../../03-reference-guide/framework/plugin/repo/PluginRepoRegistry.md): who registers the Plugin into the Protocol for DAOs to install.

<!-- TODO
- call `createPluginRepoWithFirstVersion` in `PluginRepoFactory`
- this creates the `PluginRepo` with a `1.1` version release and registers it in the `PluginRepoRegistry` with an ENS name

For all subsequent builds and releases, `createVersion` inside the registered `PluginRepo` has to be called.
 -->

### The `PluginRepoFactory` Contract

The `PluginRepoFactory` is the contract in charge of creating the first version of a plugin. It does this through the `createPluginRepoWithFirstVersion` function which creates a `PluginRepo` instance for the plugin with the first release and first build (`v1.1`).

```solidity title="@aragon/framework/repo/PluginRepoFactory.sol"
/// @notice Creates and registers a `PluginRepo` with an ENS subdomain and publishes an initial version `1.1`.
/// @param _subdomain The plugin repository subdomain.
/// @param _pluginSetup The plugin factory contract associated with the plugin version.
/// @param _maintainer The plugin maintainer address.
/// @param _releaseMetadata The release metadata URI.
/// @param _buildMetadata The build metadata URI.
/// @dev After the creation of the `PluginRepo` and release of the first version by the factory, ownership is transferred to the `_maintainer` address.
function createPluginRepoWithFirstVersion(
  string calldata _subdomain,
  address _pluginSetup,
  address _maintainer,
  bytes memory _releaseMetadata,
  bytes memory _buildMetadata
) external returns (PluginRepo pluginRepo);
```

It also registers the plugin in the Aragon OSx `PluginRepoRegistry`contract with an [ENS subdomain](../../03-ens-names.md) under the `plugin.dao.eth` domain managed by Aragon.

Additional to the information required by the [`createVersion` function discussed earlier](./index.md#the-pluginrepo-contract), it receives:

- A valid ENS `_subdomain` unique name composed of letters from a-z, all in lower caps, separated by a `-`. For ex: `token-voting-plugin`.
- The address of the plugin repo maintainer who ends up having the `ROOT_PERMISSION_ID`, `MAINTAINER_PERMISSION_ID`, and `UPGRADE_REPO_PERMISSION_ID` permissions. These permissions enable the maintainer to call the internal `PermissionManager`, the `createVersion` and `updateReleaseMetadata` functions as well as upgrading the plugin contract.

For more details visit the [`PluginRepoFactory` Reference Guide entry](../../../../03-reference-guide/framework/plugin/repo/PluginRepoFactory.md).

### The `PluginRepoRegistry` Contract

The `PluginRepoRegistry` contract is the central contract listing all the plugins managed through the Aragon OSx protocol. The `PluginRepoFactory` calls on the `PluginRepoRegistry` to register the plugin in the Aragon OSx protocol.

```solidity title="@aragon/framework/PluginRepoRegistry.sol"
/// @notice Registers a plugin repository with a subdomain and address.
/// @param subdomain The subdomain of the PluginRepo.
/// @param pluginRepo The address of the PluginRepo contract.
function registerPluginRepo(
string calldata subdomain,
address pluginRepo
) external auth(REGISTER_PLUGIN_REPO_PERMISSION_ID) {
  ...
}
```

For more details visit the [`PluginRepoRegistry` reference guide entry](../../../../03-reference-guide/framework/plugin/repo/PluginRepoRegistry.md).
