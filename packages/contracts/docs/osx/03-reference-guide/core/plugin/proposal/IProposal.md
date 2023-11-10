
## Description

An interface to be implemented by DAO plugins that create and execute proposals.

## Implementation

###  event ProposalCreated

Emitted when a proposal is created.

```solidity
event ProposalCreated(uint256 proposalId, address creator, uint64 startDate, uint64 endDate, bytes metadata, struct IDAO.Action[] actions, uint256 allowFailureMap) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `proposalId` | `uint256` | The ID of the proposal. |
| `creator` | `address` | The creator of the proposal. |
| `startDate` | `uint64` | The start date of the proposal in seconds. |
| `endDate` | `uint64` | The end date of the proposal in seconds. |
| `metadata` | `bytes` | The metadata of the proposal. |
| `actions` | `struct IDAO.Action[]` | The actions that will be executed if the proposal passes. |
| `allowFailureMap` | `uint256` | A bitmap allowing the proposal to succeed, even if individual actions might revert. If the bit at index `i` is 1, the proposal succeeds even if the `i`th action reverts. A failure map value of 0 requires every action to not revert. |

###  event ProposalExecuted

Emitted when a proposal is executed.

```solidity
event ProposalExecuted(uint256 proposalId) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `proposalId` | `uint256` | The ID of the proposal. |

### external function proposalCount

Returns the proposal count determining the next proposal ID.

```solidity
function proposalCount() external view returns (uint256) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `uint256` | The proposal count. |

<!--CONTRACT_END-->

