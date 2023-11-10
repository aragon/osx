
## Description

The interface required for a plugin setup contract to be consumed by the `PluginSetupProcessor` for plugin installations, updates, and uninstallations.

## Implementation

### public struct PreparedSetupData

```solidity
struct PreparedSetupData {
  address[] helpers;
  struct PermissionLib.MultiTargetPermission[] permissions;
}
```
### public struct SetupPayload

```solidity
struct SetupPayload {
  address plugin;
  address[] currentHelpers;
  bytes data;
}
```
### external function prepareInstallation

Prepares the installation of a plugin.

```solidity
function prepareInstallation(address _dao, bytes _data) external returns (address plugin, struct IPluginSetup.PreparedSetupData preparedSetupData) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `address` | The address of the installing DAO. |
| `_data` | `bytes` | The bytes-encoded data containing the input parameters for the installation as specified in the plugin's build metadata JSON file. |
| **Output** | |
|  `plugin`  | `address` | The address of the `Plugin` contract being prepared for installation. |
|  `preparedSetupData`  | `struct IPluginSetup.PreparedSetupData` | The deployed plugin's relevant data which consists of helpers and permissions. |

### external function prepareUpdate

Prepares the update of a plugin.

```solidity
function prepareUpdate(address _dao, uint16 _currentBuild, struct IPluginSetup.SetupPayload _payload) external returns (bytes initData, struct IPluginSetup.PreparedSetupData preparedSetupData) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `address` | The address of the updating DAO. |
| `_currentBuild` | `uint16` | The build number of the plugin to update from. |
| `_payload` | `struct IPluginSetup.SetupPayload` | The relevant data necessary for the `prepareUpdate`. See above. |
| **Output** | |
|  `initData`  | `bytes` | The initialization data to be passed to upgradeable contracts when the update is applied in the `PluginSetupProcessor`. |
|  `preparedSetupData`  | `struct IPluginSetup.PreparedSetupData` | The deployed plugin's relevant data which consists of helpers and permissions. |

### external function prepareUninstallation

Prepares the uninstallation of a plugin.

```solidity
function prepareUninstallation(address _dao, struct IPluginSetup.SetupPayload _payload) external returns (struct PermissionLib.MultiTargetPermission[] permissions) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `address` | The address of the uninstalling DAO. |
| `_payload` | `struct IPluginSetup.SetupPayload` | The relevant data necessary for the `prepareUninstallation`. See above. |
| **Output** | |
|  `permissions`  | `struct PermissionLib.MultiTargetPermission[]` | The array of multi-targeted permission operations to be applied by the `PluginSetupProcessor` to the uninstalling DAO. |

### external function implementation

Returns the plugin implementation address.

```solidity
function implementation() external view returns (address) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `address` | The address of the plugin implementation contract. |

*The implementation can be instantiated via the `new` keyword, cloned via the minimal clones pattern (see [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167)), or proxied via the UUPS pattern (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).*
<!--CONTRACT_END-->

