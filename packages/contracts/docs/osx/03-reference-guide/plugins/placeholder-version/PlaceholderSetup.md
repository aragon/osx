
## Description

A placeholder setup contract for outdated plugin builds. When moving plugin repos to new chains or layers, where only the latest release and build should be available, this placeholder can be used to populate previous builds.

## Implementation

###  error PlaceholderSetupCannotBeUsed

Thrown if the dummy is used.

```solidity
error PlaceholderSetupCannotBeUsed() 
```

### external function prepareInstallation

Prepares the installation of a plugin.

```solidity
function prepareInstallation(address, bytes) external pure returns (address, struct IPluginSetup.PreparedSetupData) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `` | `address` |  |
| `` | `bytes` |  |
| **Output** | |
|  `0`  | `address` |  |
|  `1`  | `struct IPluginSetup.PreparedSetupData` |  |

### external function prepareUninstallation

Prepares the uninstallation of a plugin.

```solidity
function prepareUninstallation(address, struct IPluginSetup.SetupPayload) external pure returns (struct PermissionLib.MultiTargetPermission[]) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `` | `address` |  |
| `` | `struct IPluginSetup.SetupPayload` |  |
| **Output** | |
|  `0`  | `struct PermissionLib.MultiTargetPermission[]` |  |

### external function implementation

Returns the plugin implementation address.

```solidity
function implementation() external pure returns (address) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `address` | The address of the plugin implementation contract. |

*The implementation can be instantiated via the `new` keyword, cloned via the minimal clones pattern (see [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167)), or proxied via the UUPS pattern (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).*
<!--CONTRACT_END-->

