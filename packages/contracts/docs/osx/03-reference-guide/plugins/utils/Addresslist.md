
## Description

The majority voting implementation using a list of member addresses.

This contract inherits from `MajorityVotingBase` and implements the `IMajorityVoting` interface.

## Implementation

###  error InvalidAddresslistUpdate

Thrown when the address list update is invalid, which can be caused by the addition of an existing member or removal of a non-existing member.

```solidity
error InvalidAddresslistUpdate(address member) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `member` | `address` | The array of member addresses to be added or removed. |

### public function isListedAtBlock

Checks if an account is on the address list at a specific block number.

```solidity
function isListedAtBlock(address _account, uint256 _blockNumber) public view virtual returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_account` | `address` | The account address being checked. |
| `_blockNumber` | `uint256` | The block number. |
| **Output** | |
|  `0`  | `bool` | Whether the account is listed at the specified block number. |

### public function isListed

Checks if an account is currently on the address list.

```solidity
function isListed(address _account) public view virtual returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_account` | `address` | The account address being checked. |
| **Output** | |
|  `0`  | `bool` | Whether the account is currently listed. |

### public function addresslistLengthAtBlock

Returns the length of the address list at a specific block number.

```solidity
function addresslistLengthAtBlock(uint256 _blockNumber) public view virtual returns (uint256) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_blockNumber` | `uint256` | The specific block to get the count from. If `0`, then the latest checkpoint value is returned. |
| **Output** | |
|  `0`  | `uint256` | The address list length at the specified block number. |

### public function addresslistLength

Returns the current length of the address list.

```solidity
function addresslistLength() public view virtual returns (uint256) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `uint256` | The current address list length. |

### internal function _addAddresses

Internal function to add new addresses to the address list.

```solidity
function _addAddresses(address[] _newAddresses) internal virtual 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_newAddresses` | `address[]` | The new addresses to be added. |

### internal function _removeAddresses

Internal function to remove existing addresses from the address list.

```solidity
function _removeAddresses(address[] _exitingAddresses) internal virtual 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_exitingAddresses` | `address[]` | The existing addresses to be removed. |

<!--CONTRACT_END-->

