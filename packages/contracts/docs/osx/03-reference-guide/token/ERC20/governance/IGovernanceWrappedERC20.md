
## Description

## Implementation

### external function depositFor

Deposits an amount of underlying token and mints the corresponding number of wrapped tokens for a receiving address.

```solidity
function depositFor(address account, uint256 amount) external returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `account` | `address` | The address receiving the minted, wrapped tokens. |
| `amount` | `uint256` | The amount of tokens to deposit. |

### external function withdrawTo

Withdraws an amount of underlying tokens to a receiving address and burns the corresponding number of wrapped tokens.

```solidity
function withdrawTo(address account, uint256 amount) external returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `account` | `address` | The address receiving the withdrawn, underlying tokens. |
| `amount` | `uint256` | The amount of underlying tokens to withdraw. |

<!--CONTRACT_END-->

