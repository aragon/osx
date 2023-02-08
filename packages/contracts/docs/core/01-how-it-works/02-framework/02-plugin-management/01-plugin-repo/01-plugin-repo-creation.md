---
title: Repo Creation
---

## The Plugin Repository Creation Process

To be available for setup in the aragonOS framework, a `PluginRepo` must be created. Two framework contracts manage the `PluginRepo` creation process:

- the [`PluginRepoFactory`](../../../../03-reference-guide/framework/plugin/repo/PluginRepoFactory.md)
- the [`PluginRepoRegistry`](../../../../03-reference-guide/framework/plugin/repo/PluginRepoRegistry.md)

and are introduced in the following.

<!-- TODO
- call `createPluginRepoWithFirstVersion` in `PluginRepoFactory`
- this creates the `PluginRepo` with a `1.0` version release and registers it in the `PluginRepoRegistry` with an ENS name

For all subsequent builds and releases, `createVersion` inside the registered `PluginRepo` has to be called.
 -->

### The `PuginRepoFactory` Contract

:::note
This section is work in progress.
:::

- calls `createPluginRepoWithFirstVersion` in `PluginRepoFactory`
- creates the `PluginRepo` with a `1.0` version release and registers it in the `PluginRepoRegistry` with an ENS

```solidity title="contracts/framework/PluginRepoFactory.sol"
/// @notice Creates and registers a `PluginRepo` with an ENS subdomain and publishes an initial version.
/// @dev The initial owner of the new PluginRepo is `address(this)`, afterward ownership will be transferred to the address `_maintainer`.
/// @param _subdomain The plugin repository subdomain.
/// @param _pluginSetup The plugin factory contract associated with the plugin version.
/// @param _maintainer The plugin maintainer address.
/// @param _releaseMetadata The release metadata URI.
/// @param _buildMetadata The build metadata URI.
function createPluginRepoWithFirstVersion(
  string calldata _subdomain,
  address _pluginSetup,
  address _maintainer,
  bytes memory _releaseMetadata,
  bytes memory _buildMetadata
) external returns (PluginRepo pluginRepo);
```

For more details visit the [`PuginRepoFactory` reference guide entry](../../../../03-reference-guide/framework/plugin/repo/PluginRepoFactory.md).

### The `PluginRepoRegistry` Contract

:::note
This section is work in progress.
:::

The `PluginRepoRegistry` contract is the central contract listing all the plugins within the Aragon framework.

```solidity title="contracts/framework/PluginRepoRegistry.sol"
/// @notice Registers a plugin repository with a subdomain and address.
/// @param subdomain The subdomain of the PluginRepo.
/// @param pluginRepo The address of the PluginRepo contract.
function registerPluginRepo(
string calldata subdomain,
address pluginRepo
) external auth(REGISTER_PLUGIN_REPO_PERMISSION_ID) {
```

For more details visit the [`PluginRepoRegistry` reference guide entry](../../../../03-reference-guide/framework/plugin/repo/PluginRepoRegistry.md).
