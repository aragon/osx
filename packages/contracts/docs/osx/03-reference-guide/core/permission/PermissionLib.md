
## Description

A library containing objects for permission processing.

## Implementation

### public variable NO_CONDITION

A constant expressing that no condition is applied to a permission.

```solidity
address NO_CONDITION 
```

###  enum Operation

```solidity
enum Operation {
  Grant,
  Revoke,
  GrantWithCondition
}
```
### public struct SingleTargetPermission

```solidity
struct SingleTargetPermission {
  enum PermissionLib.Operation operation;
  address who;
  bytes32 permissionId;
}
```
### public struct MultiTargetPermission

```solidity
struct MultiTargetPermission {
  enum PermissionLib.Operation operation;
  address where;
  address who;
  address condition;
  bytes32 permissionId;
}
```
<!--CONTRACT_END-->

