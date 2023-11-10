
## Description

The updated version of an example plugin counting numbers.

## Implementation

### public variable MULTIPLY_PERMISSION_ID

The ID of the permission required to call the `multiply` function.

```solidity
bytes32 MULTIPLY_PERMISSION_ID 
```

### public variable count

A counter variable.

```solidity
uint256 count 
```

### public variable multiplyHelper

A helper contract associated with the plugin.

```solidity
contract MultiplyHelper multiplyHelper 
```

### public variable newVariable

A new variable added in V2.

```solidity
uint256 newVariable 
```

*By appending a new variable, the existing storage gets modified.*
### external function initialize

Initializes the plugin.

```solidity
function initialize(contract IDAO _dao, contract MultiplyHelper _multiplyHelper, uint256 _count, uint256 _newVariable) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `contract IDAO` | The contract of the associated DAO. |
| `_multiplyHelper` | `contract MultiplyHelper` | The helper contract associated with the plugin to multiply numbers. |
| `_count` | `uint256` | The initial value of the counter. |
| `_newVariable` | `uint256` | The new variable that was added with V2. |

*This only gets called for daos that install it for the first time. The initializer modifier protects it from being called a second time for old proxies.*
### external function setNewVariable

Sets a the new variable that was added in V2.

```solidity
function setNewVariable(uint256 _newVariable) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_newVariable` | `uint256` | The new variable. |

*This gets called when a dao already has `CounterV1` installed and updates to this verison `CounterV2`. For these DAOs, this `setNewVariable` can only be called once which is achieved by `reinitializer(2)`.*
### public function multiply

Multiplies the count with a number.

```solidity
function multiply(uint256 _a) public view returns (uint256) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_a` | `uint256` | The number to multiply the count with. |

### public function execute

Executes something on the DAO.

```solidity
function execute() public 
```

<!--CONTRACT_END-->

