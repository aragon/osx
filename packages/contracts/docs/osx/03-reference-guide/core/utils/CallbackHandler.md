
## Description

This contract handles callbacks by registering a magic number together with the callback function's selector. It provides the `_handleCallback` function that inheriting contracts have to call inside their `fallback()` function  (`_handleCallback(msg.callbackSelector, msg.data)`).  This allows to adaptively register ERC standards (e.g., [ERC-721](https://eips.ethereum.org/EIPS/eip-721), [ERC-1115](https://eips.ethereum.org/EIPS/eip-1155), or future versions of [ERC-165](https://eips.ethereum.org/EIPS/eip-165)) and returning the required magic numbers for the associated callback functions for the inheriting contract so that it doesn't need to be upgraded.

This callback handling functionality is intented to be used by executor contracts (i.e., `DAO.sol`).

## Implementation

### internal variable callbackMagicNumbers

A mapping between callback function selectors and magic return numbers.

```solidity
mapping(bytes4 => bytes4) callbackMagicNumbers 
```

### internal variable UNREGISTERED_CALLBACK

The magic number refering to unregistered callbacks.

```solidity
bytes4 UNREGISTERED_CALLBACK 
```

###  error UnkownCallback

Thrown if the callback function is not registered.

```solidity
error UnkownCallback(bytes4 callbackSelector, bytes4 magicNumber) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `callbackSelector` | `bytes4` | The selector of the callback function. |
| `magicNumber` | `bytes4` | The magic number to be registered for the callback function selector. |

###  event CallbackReceived

Emitted when `_handleCallback` is called.

```solidity
event CallbackReceived(address sender, bytes4 sig, bytes data) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `sender` | `address` | Who called the callback. |
| `sig` | `bytes4` | The function signature. |
| `data` | `bytes` | The calldata. |

### internal function _handleCallback

Handles callbacks to adaptively support ERC standards.

```solidity
function _handleCallback(bytes4 _callbackSelector, bytes _data) internal virtual returns (bytes4) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_callbackSelector` | `bytes4` | The function selector of the callback function. |
| `_data` | `bytes` | The calldata. |
| **Output** | |
|  `0`  | `bytes4` | The magic number registered for the function selector triggering the fallback. |

*This function is supposed to be called via `_handleCallback(msg.sig, msg.data)` in the `fallback()` function of the inheriting contract.*
### internal function _registerCallback

Registers a magic number for a callback function selector.

```solidity
function _registerCallback(bytes4 _callbackSelector, bytes4 _magicNumber) internal virtual 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_callbackSelector` | `bytes4` | The selector of the callback function. |
| `_magicNumber` | `bytes4` | The magic number to be registered for the callback function selector. |

<!--CONTRACT_END-->

