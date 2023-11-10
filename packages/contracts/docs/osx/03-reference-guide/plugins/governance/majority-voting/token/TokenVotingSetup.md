
## Description

The setup contract of the `TokenVoting` plugin.

## Implementation

### public variable governanceERC20Base

The address of the `GovernanceERC20` base contract.

```solidity
address governanceERC20Base 
```

### public variable governanceWrappedERC20Base

The address of the `GovernanceWrappedERC20` base contract.

```solidity
address governanceWrappedERC20Base 
```

### public struct TokenSettings

```solidity
struct TokenSettings {
  address addr;
  string name;
  string symbol;
}
```
###  error TokenNotContract

Thrown if token address is passed which is not a token.

```solidity
error TokenNotContract(address token) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `token` | `address` | The token address |

###  error TokenNotERC20

Thrown if token address is not ERC20.

```solidity
error TokenNotERC20(address token) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `token` | `address` | The token address |

###  error WrongHelpersArrayLength

Thrown if passed helpers array is of wrong length.

```solidity
error WrongHelpersArrayLength(uint256 length) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `length` | `uint256` | The array length of passed helpers. |

### public function constructor

The contract constructor deploying the plugin implementation contract and receiving the governance token base contracts to clone from.

```solidity
constructor(contract GovernanceERC20 _governanceERC20Base, contract GovernanceWrappedERC20 _governanceWrappedERC20Base) public 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_governanceERC20Base` | `contract GovernanceERC20` | The base `GovernanceERC20` contract to create clones from. |
| `_governanceWrappedERC20Base` | `contract GovernanceWrappedERC20` | The base `GovernanceWrappedERC20` contract to create clones from. |

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

### external function implementation

Returns the plugin implementation address.

```solidity
function implementation() external view virtual returns (address) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `address` | The address of the plugin implementation contract. |

*The implementation can be instantiated via the `new` keyword, cloned via the minimal clones pattern (see [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167)), or proxied via the UUPS pattern (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).*
<!--CONTRACT_END-->

