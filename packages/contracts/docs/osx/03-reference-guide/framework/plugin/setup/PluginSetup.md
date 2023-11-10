
## Description

An abstract contract that developers have to inherit from to write the setup of a plugin.

## Implementation

### external function prepareUpdate

Prepares the update of a plugin.

```solidity
function prepareUpdate(address _dao, uint16 _currentBuild, struct IPluginSetup.SetupPayload _payload) external virtual returns (bytes initData, struct IPluginSetup.PreparedSetupData preparedSetupData) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `address` | The address of the updating DAO. |
| `_currentBuild` | `uint16` | The build number of the plugin to update from. |
| `_payload` | `struct IPluginSetup.SetupPayload` | The relevant data necessary for the `prepareUpdate`. See above. |
| **Output** | |
|  `initData`  | `bytes` | The initialization data to be passed to upgradeable contracts when the update is applied in the `PluginSetupProcessor`. |
|  `preparedSetupData`  | `struct IPluginSetup.PreparedSetupData` | The deployed plugin's relevant data which consists of helpers and permissions. |

### internal function createERC1967Proxy

A convenience function to create an [ERC-1967](https://eips.ethereum.org/EIPS/eip-1967) proxy contract pointing to an implementation and being associated to a DAO.

```solidity
function createERC1967Proxy(address _implementation, bytes _data) internal returns (address) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_implementation` | `address` | The address of the implementation contract to which the proxy is pointing to. |
| `_data` | `bytes` | The data to initialize the storage of the proxy contract. |
| **Output** | |
|  `0`  | `address` | The address of the created proxy contract. |

### public function supportsInterface

Checks if this or the parent contract supports an interface by its ID.

```solidity
function supportsInterface(bytes4 _interfaceId) public view virtual returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_interfaceId` | `bytes4` | The ID of the interface. |
| **Output** | |
|  `0`  | `bool` | Returns `true` if the interface is supported. |

<!--CONTRACT_END-->

