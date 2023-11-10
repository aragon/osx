
## Description

A helper contract providing a multiply function for the `CounterV1` and `CounterV2` example contracts.

## Implementation

### public variable MULTIPLY_PERMISSION_ID

The ID of the permission required to call the `multiply` function.

```solidity
bytes32 MULTIPLY_PERMISSION_ID 
```

### external function multiply

Multiplies the count with a number.

```solidity
function multiply(uint256 _a, uint256 _b) external view returns (uint256) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_a` | `uint256` | The number to multiply the count with. |
| `_b` | `uint256` |  |

<!--CONTRACT_END-->

