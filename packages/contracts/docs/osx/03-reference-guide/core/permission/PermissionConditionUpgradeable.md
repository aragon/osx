
## Description

An abstract contract for upgradeable or cloneable contracts to inherit from and to support customary permissions depending on arbitrary on-chain state.

## Implementation

### public function supportsInterface

Checks if an interface is supported by this or its parent contract.

```solidity
function supportsInterface(bytes4 _interfaceId) public view virtual returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_interfaceId` | `bytes4` | The ID of the interface. |
| **Output** | |
|  `0`  | `bool` | Returns `true` if the interface is supported. |

<!--CONTRACT_END-->

