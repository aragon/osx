
## Description

An abstract contract providing a meta-transaction compatible modifier for non-upgradeable contracts instantiated via the `new` keyword to authorize function calls through an associated DAO.

## Implementation

### internal function constructor

Constructs the contract by setting the associated DAO.

```solidity
constructor(contract IDAO _dao) internal 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `contract IDAO` | The associated DAO address. |

### public function dao

Returns the DAO contract.

```solidity
function dao() public view returns (contract IDAO) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `contract IDAO` | The DAO contract. |

### internal modifier auth

A modifier to make functions on inheriting contracts authorized. Permissions to call the function are checked through the associated DAO's permission manager.

```solidity
modifier auth(bytes32 _permissionId) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_permissionId` | `bytes32` | The permission identifier required to call the method this modifier is applied to. |

<!--CONTRACT_END-->

