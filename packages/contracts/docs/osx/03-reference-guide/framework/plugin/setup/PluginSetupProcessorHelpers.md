
### public struct PluginSetupRef

```solidity
struct PluginSetupRef {
  struct PluginRepo.Tag versionTag;
  contract PluginRepo pluginSetupRepo;
}
```

###  enum PreparationType

```solidity
enum PreparationType {
  None,
  Installation,
  Update,
  Uninstallation
}
```

### internal function _getPluginInstallationId

Returns an ID for plugin installation by hashing the DAO and plugin address.

```solidity
function _getPluginInstallationId(address _dao, address _plugin) internal pure returns (bytes32) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `address` | The address of the DAO conducting the setup. |
| `_plugin` | `address` | The plugin address. |

### internal function _getPreparedSetupId

Returns an ID for prepared setup obtained from hashing characterizing elements.

```solidity
function _getPreparedSetupId(struct PluginSetupRef _pluginSetupRef, bytes32 _permissionsHash, bytes32 _helpersHash, bytes _data, enum PreparationType _preparationType) internal pure returns (bytes32) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_pluginSetupRef` | `struct PluginSetupRef` | The reference of the plugin setup containing plugin setup repo and version tag. |
| `_permissionsHash` | `bytes32` | The hash of the permission operations requested by the setup. |
| `_helpersHash` | `bytes32` | The hash of the helper contract addresses. |
| `_data` | `bytes` | The bytes-encoded initialize data for the upgrade that is returned by `prepareUpdate`. |
| `_preparationType` | `enum PreparationType` | The type of preparation the plugin is currently undergoing. Without this, it is possible to call `applyUpdate` even after `applyInstallation` is called. |
| **Output** | |
|  `0`  | `bytes32` | The prepared setup id. |

### internal function _getAppliedSetupId

Returns an identifier for applied installations.

```solidity
function _getAppliedSetupId(struct PluginSetupRef _pluginSetupRef, bytes32 _helpersHash) internal pure returns (bytes32) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_pluginSetupRef` | `struct PluginSetupRef` | The reference of the plugin setup containing plugin setup repo and version tag. |
| `_helpersHash` | `bytes32` | The hash of the helper contract addresses. |
| **Output** | |
|  `0`  | `bytes32` | The applied setup id. |

### internal function hashHelpers

Returns a hash of an array of helper addresses (contracts or EOAs).

```solidity
function hashHelpers(address[] _helpers) internal pure returns (bytes32) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_helpers` | `address[]` | The array of helper addresses (contracts or EOAs) to be hashed. |

### internal function hashPermissions

Returns a hash of an array of multi-targeted permission operations.

```solidity
function hashPermissions(struct PermissionLib.MultiTargetPermission[] _permissions) internal pure returns (bytes32) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_permissions` | `struct PermissionLib.MultiTargetPermission[]` | The array of of multi-targeted permission operations. |
| **Output** | |
|  `0`  | `bytes32` | The hash of the array of permission operations. |

