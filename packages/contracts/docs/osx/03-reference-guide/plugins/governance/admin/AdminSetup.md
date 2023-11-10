
## Description

The setup contract of the `Admin` plugin.

## Implementation

###  error AdminAddressInvalid

Thrown if the admin address is zero.

```solidity
error AdminAddressInvalid(address admin) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `admin` | `address` | The admin address. |

### public function constructor

The constructor setting the `Admin` implementation contract to clone from.

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

*Currently, there is no reliable way to revoke the `ADMIN_EXECUTE_PERMISSION_ID` from all addresses it has been granted to. Accordingly, only the `EXECUTE_PERMISSION_ID` is revoked for this uninstallation.*
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

