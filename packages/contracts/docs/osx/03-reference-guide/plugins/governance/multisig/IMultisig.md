
## Description

An interface for an on-chain multisig governance plugin in which a proposal passes if X out of Y approvals are met.

## Implementation

### external function addAddresses

Adds new members to the address list. Previously, it checks if the new address list length would be greater than `type(uint16).max`, the maximal number of approvals.

```solidity
function addAddresses(address[] _members) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_members` | `address[]` | The addresses of the members to be added. |

### external function removeAddresses

Removes existing members from the address list. Previously, it checks if the new address list length is at least as long as the minimum approvals parameter requires. Note that `minApprovals` is must be at least 1 so the address list cannot become empty.

```solidity
function removeAddresses(address[] _members) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_members` | `address[]` | The addresses of the members to be removed. |

### external function approve

Approves and, optionally, executes the proposal.

```solidity
function approve(uint256 _proposalId, bool _tryExecution) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| `_tryExecution` | `bool` | If `true`, execution is tried after the approval cast. The call does not revert if execution is not possible. |

### external function canApprove

Checks if an account can participate on a proposal vote. This can be because the vote
- was executed, or
- the voter is not listed.

```solidity
function canApprove(uint256 _proposalId, address _account) external view returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The proposal Id. |
| `_account` | `address` | The address of the user to check. |
| **Output** | |
|  `0`  | `bool` | Returns true if the account is allowed to vote. |

*The function assumes the queried proposal exists.*
### external function canExecute

Checks if a proposal can be executed.

```solidity
function canExecute(uint256 _proposalId) external view returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal to be checked. |
| **Output** | |
|  `0`  | `bool` | True if the proposal can be executed, false otherwise. |

### external function hasApproved

Returns whether the account has approved the proposal. Note, that this does not check if the account is listed.

```solidity
function hasApproved(uint256 _proposalId, address _account) external view returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| `_account` | `address` | The account address to be checked. |
| **Output** | |
|  `0`  | `bool` | The vote option cast by a voter for a certain proposal. |

### external function execute

Executes a proposal.

```solidity
function execute(uint256 _proposalId) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal to be executed. |

<!--CONTRACT_END-->

