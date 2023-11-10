
## Description

The interface of majority voting plugin.

## Implementation

###  enum VoteOption

```solidity
enum VoteOption {
  None,
  Abstain,
  Yes,
  No
}
```
###  event VoteCast

Emitted when a vote is cast by a voter.

```solidity
event VoteCast(uint256 proposalId, address voter, enum IMajorityVoting.VoteOption voteOption, uint256 votingPower) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `proposalId` | `uint256` | The ID of the proposal. |
| `voter` | `address` | The voter casting the vote. |
| `voteOption` | `enum IMajorityVoting.VoteOption` | The casted vote option. |
| `votingPower` | `uint256` | The voting power behind this vote. |

### external function supportThreshold

Returns the support threshold parameter stored in the voting settings.

```solidity
function supportThreshold() external view returns (uint32) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `uint32` | The support threshold parameter. |

### external function minParticipation

Returns the minimum participation parameter stored in the voting settings.

```solidity
function minParticipation() external view returns (uint32) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `uint32` | The minimum participation parameter. |

### external function isSupportThresholdReached

Checks if the support value defined as $$\texttt{support} = \frac{N_\text{yes}}{N_\text{yes}+N_\text{no}}$$ for a proposal vote is greater than the support threshold.

```solidity
function isSupportThresholdReached(uint256 _proposalId) external view returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| **Output** | |
|  `0`  | `bool` | Returns `true` if the  support is greater than the support threshold and `false` otherwise. |

### external function isSupportThresholdReachedEarly

Checks if the worst-case support value defined as $$\texttt{worstCaseSupport} = \frac{N_\text{yes}}{ N_\text{total}-N_\text{abstain}}$$ for a proposal vote is greater than the support threshold.

```solidity
function isSupportThresholdReachedEarly(uint256 _proposalId) external view returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| **Output** | |
|  `0`  | `bool` | Returns `true` if the worst-case support is greater than the support threshold and `false` otherwise. |

### external function isMinParticipationReached

Checks if the participation value defined as $$\texttt{participation} = \frac{N_\text{yes}+N_\text{no}+N_\text{abstain}}{N_\text{total}}$$ for a proposal vote is greater or equal than the minimum participation value.

```solidity
function isMinParticipationReached(uint256 _proposalId) external view returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| **Output** | |
|  `0`  | `bool` | Returns `true` if the participation is greater than the minimum participation and `false` otherwise. |

### external function canVote

Checks if an account can participate on a proposal vote. This can be because the vote
- has not started,
- has ended,
- was executed, or
- the voter doesn't have voting powers.

```solidity
function canVote(uint256 _proposalId, address _account, enum IMajorityVoting.VoteOption _voteOption) external view returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The proposal Id. |
| `_account` | `address` | The account address to be checked. |
| `_voteOption` | `enum IMajorityVoting.VoteOption` | Whether the voter abstains, supports or opposes the proposal. |
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

### external function vote

Votes for a vote option and, optionally, executes the proposal.

```solidity
function vote(uint256 _proposalId, enum IMajorityVoting.VoteOption _voteOption, bool _tryEarlyExecution) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| `_voteOption` | `enum IMajorityVoting.VoteOption` | The chosen vote option. |
| `_tryEarlyExecution` | `bool` | If `true`,  early execution is tried after the vote cast. The call does not revert if early execution is not possible. |

*`_voteOption`, 1 -> abstain, 2 -> yes, 3 -> no*
### external function execute

Executes a proposal.

```solidity
function execute(uint256 _proposalId) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal to be executed. |

### external function getVoteOption

Returns whether the account has voted for the proposal.  Note, that this does not check if the account has voting power.

```solidity
function getVoteOption(uint256 _proposalId, address _account) external view returns (enum IMajorityVoting.VoteOption) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| `_account` | `address` | The account address to be checked. |
| **Output** | |
|  `0`  | `enum IMajorityVoting.VoteOption` | The vote option cast by a voter for a certain proposal. |

<!--CONTRACT_END-->

