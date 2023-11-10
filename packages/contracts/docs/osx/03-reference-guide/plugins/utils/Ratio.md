
### internal variable RATIO_BASE

```solidity
uint256 RATIO_BASE 
```

###  error RatioOutOfBounds

Thrown if a ratio value exceeds the maximal value of `10**6`.

```solidity
error RatioOutOfBounds(uint256 limit, uint256 actual) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `limit` | `uint256` | The maximal value. |
| `actual` | `uint256` | The actual value. |

### internal function _applyRatioCeiled

Applies a ratio to a value and ceils the remainder.

```solidity
function _applyRatioCeiled(uint256 _value, uint256 _ratio) internal pure returns (uint256 result) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_value` | `uint256` | The value to which the ratio is applied. |
| `_ratio` | `uint256` | The ratio that must be in the interval `[0, 10**6]`. |
| **Output** | |
|  `result`  | `uint256` | The resulting value. |

