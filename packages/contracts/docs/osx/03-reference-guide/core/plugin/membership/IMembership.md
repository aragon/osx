
## Description

An interface to be implemented by DAO plugins that define membership.

## Implementation

###  event MembersAdded

Emitted when members are added to the DAO plugin.

```solidity
event MembersAdded(address[] members) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `members` | `address[]` | The list of new members being added. |

###  event MembersRemoved

Emitted when members are removed from the DAO plugin.

```solidity
event MembersRemoved(address[] members) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `members` | `address[]` | The list of existing members being removed. |

###  event MembershipContractAnnounced

Emitted to announce the membership being defined by a contract.

```solidity
event MembershipContractAnnounced(address definingContract) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `definingContract` | `address` | The contract defining the membership. |

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
<!--CONTRACT_END-->

