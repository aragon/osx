
## Description

The admin governance plugin giving execution permission on the DAO to a single address.

## Implementation

### internal variable ADMIN_INTERFACE_ID

The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.

```solidity
bytes4 ADMIN_INTERFACE_ID 
```

### public variable EXECUTE_PROPOSAL_PERMISSION_ID

The ID of the permission required to call the `executeProposal` function.

```solidity
bytes32 EXECUTE_PROPOSAL_PERMISSION_ID 
```

### external function initialize

Initializes the contract.

```solidity
function initialize(contract IDAO _dao) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `contract IDAO` | The associated DAO. |

*This method is required to support [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167).*
### public function supportsInterface

Checks if this or the parent contract supports an interface by its ID.

```solidity
function supportsInterface(bytes4 _interfaceId) public view returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_interfaceId` | `bytes4` | The ID of the interface. |
| **Output** | |
|  `0`  | `bool` | Returns `true` if the interface is supported. |

### external function isMember

Checks if an account is a member of the DAO.

```solidity
function isMember(address _account) external view returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_account` | `address` | The address of the account to be checked. |
| **Output** | |
|  `0`  | `bool` | Whether the account is a member or not. |

*This function must be implemented in the plugin contract that introduces the members to the DAO.*
### external function executeProposal

Creates and executes a new proposal.

```solidity
function executeProposal(bytes _metadata, struct IDAO.Action[] _actions, uint256 _allowFailureMap) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_metadata` | `bytes` | The metadata of the proposal. |
| `_actions` | `struct IDAO.Action[]` | The actions to be executed. |
| `_allowFailureMap` | `uint256` | A bitmap allowing the proposal to succeed, even if individual actions might revert. If the bit at index `i` is 1, the proposal succeeds even if the `i`th action reverts. A failure map value of 0 requires every action to not revert. |

<!--CONTRACT_END-->

