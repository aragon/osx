
## Description

An abstract contract containing the traits and internal functionality to create and execute proposals that can be inherited by non-upgradeable DAO plugins.

## Implementation

### public function proposalCount

Returns the proposal count determining the next proposal ID.

```solidity
function proposalCount() public view returns (uint256) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `uint256` | The proposal count. |

### public function supportsInterface

Checks if this or the parent contract supports an interface by its ID.

```solidity
function supportsInterface(bytes4 _interfaceId) public view virtual returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_interfaceId` | `bytes4` | The ID of the interface. |
| **Output** | |
|  `0`  | `bool` | Returns `true` if the interface is supported. |

### internal function _createProposalId

Creates a proposal ID.

```solidity
function _createProposalId() internal returns (uint256 proposalId) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `proposalId`  | `uint256` | The proposal ID. |

### internal function _createProposal

Internal function to create a proposal.

```solidity
function _createProposal(address _creator, bytes _metadata, uint64 _startDate, uint64 _endDate, struct IDAO.Action[] _actions, uint256 _allowFailureMap) internal virtual returns (uint256 proposalId) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_creator` | `address` |  |
| `_metadata` | `bytes` | The proposal metadata. |
| `_startDate` | `uint64` | The start date of the proposal in seconds. |
| `_endDate` | `uint64` | The end date of the proposal in seconds. |
| `_actions` | `struct IDAO.Action[]` | The actions that will be executed after the proposal passes. |
| `_allowFailureMap` | `uint256` | A bitmap allowing the proposal to succeed, even if individual actions might revert. If the bit at index `i` is 1, the proposal succeeds even if the `i`th action reverts. A failure map value of 0 requires every action to not revert. |
| **Output** | |
|  `proposalId`  | `uint256` | The ID of the proposal. |

### internal function _executeProposal

Internal function to execute a proposal.

```solidity
function _executeProposal(contract IDAO _dao, uint256 _proposalId, struct IDAO.Action[] _actions, uint256 _allowFailureMap) internal virtual returns (bytes[] execResults, uint256 failureMap) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `contract IDAO` |  |
| `_proposalId` | `uint256` | The ID of the proposal to be executed. |
| `_actions` | `struct IDAO.Action[]` | The array of actions to be executed. |
| `_allowFailureMap` | `uint256` | A bitmap allowing the proposal to succeed, even if individual actions might revert. If the bit at index `i` is 1, the proposal succeeds even if the `i`th action reverts. A failure map value of 0 requires every action to not revert. |
| **Output** | |
|  `execResults`  | `bytes[]` | The array with the results of the executed actions. |
|  `failureMap`  | `uint256` | The failure map encoding which actions have failed. |

<!--CONTRACT_END-->

