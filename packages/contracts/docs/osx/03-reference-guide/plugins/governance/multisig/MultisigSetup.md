
## Description

The setup contract of the `Multisig` plugin.

## Implementation

### public function constructor

The contract constructor, that deploys the `Multisig` plugin logic contract.

```solidity
constructor() public 
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

```solidity
function prepareUpdate(address _dao, uint16 _currentBuild, struct IPluginSetup.SetupPayload _payload) external pure returns (bytes initData, struct IPluginSetup.PreparedSetupData preparedSetupData) 
```

### external function prepareUninstallation

Prepares the uninstallation of a plugin.

```solidity
function prepareUninstallation(address _dao, struct IPluginSetup.SetupPayload _payload) external view returns (struct PermissionLib.MultiTargetPermission[] permissions) 
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

