
## Description

An interface to be implemented to support custom permission logic.

To attach a condition to a permission, the `grantWithCondition` function must be used and refer to the implementing contract's address with the `condition` argument.

## Implementation

### external function isGranted

Checks if a call is permitted.

```solidity
function isGranted(address _where, address _who, bytes32 _permissionId, bytes _data) external view returns (bool isPermitted) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_where` | `address` | The address of the target contract. |
| `_who` | `address` | The address (EOA or contract) for which the permissions are checked. |
| `_permissionId` | `bytes32` | The permission identifier. |
| `_data` | `bytes` | Optional data passed to the `PermissionCondition` implementation. |
| **Output** | |
|  `isPermitted`  | `bool` | Returns true if the call is permitted. |

<!--CONTRACT_END-->

