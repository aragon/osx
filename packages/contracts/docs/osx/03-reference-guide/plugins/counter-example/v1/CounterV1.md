
## Description

The first version of an example plugin counting numbers.

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

### external function initialize

Initializes the plugin.

```solidity
function initialize(contract IDAO _dao, contract MultiplyHelper _multiplyHelper, uint256 _count) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `contract IDAO` | The contract of the associated DAO. |
| `_multiplyHelper` | `contract MultiplyHelper` | The helper contract associated with the plugin to multiply numbers. |
| `_count` | `uint256` | The initial value of the counter. |

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

