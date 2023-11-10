
### internal function _uncheckedIncrement

Increments an unsigned integer by one without checking the result for overflow errors (using safe math).

```solidity
function _uncheckedIncrement(uint256 i) internal pure returns (uint256) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `i` | `uint256` | The number to be incremented. |
| **Output** | |
|  `0`  | `uint256` | The number incremented by one. |

### internal function _uncheckedAdd

Adds two unsigned integers without checking the result for overflow errors (using safe math).

```solidity
function _uncheckedAdd(uint256 a, uint256 b) internal pure returns (uint256) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `a` | `uint256` | The first summand. |
| `b` | `uint256` | The second summand. |
| **Output** | |
|  `0`  | `uint256` | The sum. |

### internal function _uncheckedSub

Subtracts two unsigned integers without checking the result for overflow errors (using safe math).

```solidity
function _uncheckedSub(uint256 a, uint256 b) internal pure returns (uint256) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `a` | `uint256` | The minuend. |
| `b` | `uint256` | The subtrahend. |
| **Output** | |
|  `0`  | `uint256` | The difference. |

