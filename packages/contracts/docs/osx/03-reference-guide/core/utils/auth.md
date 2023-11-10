
###  error DaoUnauthorized

Thrown if a call is unauthorized in the associated DAO.

```solidity
error DaoUnauthorized(address dao, address where, address who, bytes32 permissionId) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `dao` | `address` | The associated DAO. |
| `where` | `address` | The context in which the authorization reverted. |
| `who` | `address` | The address (EOA or contract) missing the permission. |
| `permissionId` | `bytes32` | The permission identifier. |

### internal function _auth

A free function checking if a caller is granted permissions on a target contract via a permission identifier that redirects the approval to a `PermissionCondition` if this was specified in the setup.

```solidity
function _auth(contract IDAO _dao, address _where, address _who, bytes32 _permissionId, bytes _data) internal view 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `contract IDAO` |  |
| `_where` | `address` | The address of the target contract for which `who` receives permission. |
| `_who` | `address` | The address (EOA or contract) owning the permission. |
| `_permissionId` | `bytes32` | The permission identifier. |
| `_data` | `bytes` | The optional data passed to the `PermissionCondition` registered. |

