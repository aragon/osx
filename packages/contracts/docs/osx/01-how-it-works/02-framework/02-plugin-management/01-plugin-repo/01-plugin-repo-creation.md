---
title: Repo Creation
---

## The Plugin Repo Creation Process

To be available for setup in the Aragon OSx framework, a `PluginRepo` must be created. Two framework contracts manage the `PluginRepo` creation process:

- The [`PluginRepoFactory`](../../../../03-reference-guide/framework/plugin/repo/PluginRepoFactory.md)
- The [`PluginRepoRegistry`](../../../../03-reference-guide/framework/plugin/repo/PluginRepoRegistry.md)

and are introduced in the following.

<!-- TODO
- call `createPluginRepoWithFirstVersion` in `PluginRepoFactory`
- this creates the `PluginRepo` with a `1.1` version release and registers it in the `PluginRepoRegistry` with an ENS name

For all subsequent builds and releases, `createVersion` inside the registered `PluginRepo` has to be called.
 -->

### The `PluginRepoFactory` Contract

The `PluginRepoFactory` is a contract of the Aragon OSx protocol framework infrastructure being called when the first version if a plugin is published.
It contains the `createPluginRepoWithFirstVersion`,

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

which creates a `PluginRepo` with the first release and first build (`v1.1`) inside and registers it in the Aragon OSx `PluginRepoRegistry`contract with an [ENS subdomain](../../03-ens-names.md) under the`plugin.dao.eth` domain managed by Aragon.

Additional to the information required by the [`createVersion` function discussed earlier](./index.md/#the-puginrepo-contract), it receives

- A valid ENS `_subdomain` name under that isn't already taken
- The address of the plugin repo maintainer who ends up having the `ROOT_PERMISSION_ID`, `MAINTAINER_PERMISSION_ID`, and `UPGRADE_REPO_PERMISSION_ID` permission allowing to call the internal `PermissionManager`, the `createVersion` and `updateReleaseMetadata` functions as well as upgrading the contract.

For more details visit the [`PluginRepoFactory` reference guide entry](../../../../03-reference-guide/framework/plugin/repo/PluginRepoFactory.md).

### The `PluginRepoRegistry` Contract

:::note
This page is a stub and work in progress.
:::

The `PluginRepoRegistry` contract is the central contract listing all the plugins managed through the Aragon OSx protocol:

```solidity title="@aragon/framework/PluginRepoRegistry.sol"
/// @notice Registers a plugin repository with a subdomain and address.
/// @param subdomain The subdomain of the PluginRepo.
/// @param pluginRepo The address of the PluginRepo contract.
function registerPluginRepo(
string calldata subdomain,
address pluginRepo
) external auth(REGISTER_PLUGIN_REPO_PERMISSION_ID) {
```

For more details visit the [`PluginRepoRegistry` reference guide entry](../../../../03-reference-guide/framework/plugin/repo/PluginRepoRegistry.md).
