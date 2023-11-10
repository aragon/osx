
### internal function hasBit

```solidity
function hasBit(uint256 bitmap, uint8 index) internal pure returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `bitmap` | `uint256` | The `uint256` representation of bits. |
| `index` | `uint8` | The index number to check whether 1 or 0 is set. |
| **Output** | |
|  `0`  | `bool` | Returns `true` if the bit is set at `index` on `bitmap`. |

### internal function flipBit

```solidity
function flipBit(uint256 bitmap, uint8 index) internal pure returns (uint256) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `bitmap` | `uint256` | The `uint256` representation of bits. |
| `index` | `uint8` | The index number to set the bit. |
| **Output** | |
|  `0`  | `uint256` | Returns a new number in which the bit is set at `index`. |

