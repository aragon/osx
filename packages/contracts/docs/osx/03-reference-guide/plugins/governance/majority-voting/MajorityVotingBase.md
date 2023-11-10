
## Description

The abstract implementation of majority voting plugins.

### Parameterization

We define two parameters
$$\texttt{support} = \frac{N_\text{yes}}{N_\text{yes} + N_\text{no}} \in [0,1]$$
and
$$\texttt{participation} = \frac{N_\text{yes} + N_\text{no} + N_\text{abstain}}{N_\text{total}} \in [0,1],$$
where $N_\text{yes}$, $N_\text{no}$, and $N_\text{abstain}$ are the yes, no, and abstain votes that have been cast and $N_\text{total}$ is the total voting power available at proposal creation time.

#### Limit Values: Support Threshold & Minimum Participation

Two limit values are associated with these parameters and decide if a proposal execution should be possible: $\texttt{supportThreshold} \in [0,1]$ and $\texttt{minParticipation} \in [0,1]$.

For threshold values, $>$ comparison is used. This **does not** include the threshold value. E.g., for $\texttt{supportThreshold} = 50\%$, the criterion is fulfilled if there is at least one more yes than no votes ($N_\text{yes} = N_\text{no} + 1$).
For minimum values, $\ge{}$ comparison is used. This **does** include the minimum participation value. E.g., for $\texttt{minParticipation} = 40\%$ and $N_\text{total} = 10$, the criterion is fulfilled if 4 out of 10 votes were casted.

Majority voting implies that the support threshold is set with
$$\texttt{supportThreshold} \ge 50\% .$$
However, this is not enforced by the contract code and developers can make unsafe parameters and only the frontend will warn about bad parameter settings.

### Execution Criteria

After the vote is closed, two criteria decide if the proposal passes.

#### The Support Criterion

For a proposal to pass, the required ratio of yes and no votes must be met:
$$(1- \texttt{supportThreshold}) \cdot N_\text{yes} > \texttt{supportThreshold} \cdot N_\text{no}.$$
Note, that the inequality yields the simple majority voting condition for $\texttt{supportThreshold}=\frac{1}{2}$.

#### The Participation Criterion

For a proposal to pass, the minimum voting power must have been cast:
$$N_\text{yes} + N_\text{no} + N_\text{abstain} \ge \texttt{minVotingPower},$$
where $\texttt{minVotingPower} = \texttt{minParticipation} \cdot N_\text{total}$.

### Vote Replacement Execution

The contract allows votes to be replaced. Voters can vote multiple times and only the latest voteOption is tallied.

### Early Execution

This contract allows a proposal to be executed early, iff the vote outcome cannot change anymore by more people voting. Accordingly, vote replacement and early execution are /// mutually exclusive options.
The outcome cannot change anymore iff the support threshold is met even if all remaining votes are no votes. We call this number the worst-case number of no votes and define it as

$$N_\text{no, worst-case} = N_\text{no, worst-case} + \texttt{remainingVotes}$$

where

$$\texttt{remainingVotes} = N_\text{total}-\underbrace{(N_\text{yes}+N_\text{no}+N_\text{abstain})}_{\text{turnout}}.$$

We can use this quantity to calculate the worst-case support that would be obtained if all remaining votes are casted with no:

$$
\begin{align*}
  \texttt{worstCaseSupport}
  &= \frac{N_\text{yes}}{N_\text{yes} + (N_\text{no, worst-case})} \\[3mm]
  &= \frac{N_\text{yes}}{N_\text{yes} + (N_\text{no} + \texttt{remainingVotes})} \\[3mm]
  &= \frac{N_\text{yes}}{N_\text{yes} +  N_\text{no} + N_\text{total} - (N_\text{yes} + N_\text{no} + N_\text{abstain})} \\[3mm]
  &= \frac{N_\text{yes}}{N_\text{total} - N_\text{abstain}}
\end{align*}
$$

In analogy, we can modify [the support criterion](#the-support-criterion) from above to allow for early execution:

$$
\begin{align*}
  (1 - \texttt{supportThreshold}) \cdot N_\text{yes}
  &> \texttt{supportThreshold} \cdot  N_\text{no, worst-case} \\[3mm]
  &> \texttt{supportThreshold} \cdot (N_\text{no} + \texttt{remainingVotes}) \\[3mm]
  &> \texttt{supportThreshold} \cdot (N_\text{no} + N_\text{total}-(N_\text{yes}+N_\text{no}+N_\text{abstain})) \\[3mm]
  &> \texttt{supportThreshold} \cdot (N_\text{total} - N_\text{yes} - N_\text{abstain})
\end{align*}
$$

Accordingly, early execution is possible when the vote is open, the modified support criterion, and the particicpation criterion are met.

This contract implements the `IMajorityVoting` interface.

## Implementation

###  enum VotingMode

```solidity
enum VotingMode {
  Standard,
  EarlyExecution,
  VoteReplacement
}
```
### public struct VotingSettings

```solidity
struct VotingSettings {
  enum MajorityVotingBase.VotingMode votingMode;
  uint32 supportThreshold;
  uint32 minParticipation;
  uint64 minDuration;
  uint256 minProposerVotingPower;
}
```
### public struct Proposal

```solidity
struct Proposal {
  bool executed;
  struct MajorityVotingBase.ProposalParameters parameters;
  struct MajorityVotingBase.Tally tally;
  mapping(address => enum IMajorityVoting.VoteOption) voters;
  struct IDAO.Action[] actions;
  uint256 allowFailureMap;
}
```
### public struct ProposalParameters

```solidity
struct ProposalParameters {
  enum MajorityVotingBase.VotingMode votingMode;
  uint32 supportThreshold;
  uint64 startDate;
  uint64 endDate;
  uint64 snapshotBlock;
  uint256 minVotingPower;
}
```
### public struct Tally

```solidity
struct Tally {
  uint256 abstain;
  uint256 yes;
  uint256 no;
}
```
### internal variable MAJORITY_VOTING_BASE_INTERFACE_ID

The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.

```solidity
bytes4 MAJORITY_VOTING_BASE_INTERFACE_ID 
```

### public variable UPDATE_VOTING_SETTINGS_PERMISSION_ID

The ID of the permission required to call the `updateVotingSettings` function.

```solidity
bytes32 UPDATE_VOTING_SETTINGS_PERMISSION_ID 
```

### internal variable proposals

A mapping between proposal IDs and proposal information.

```solidity
mapping(uint256 => struct MajorityVotingBase.Proposal) proposals 
```

###  error DateOutOfBounds

Thrown if a date is out of bounds.

```solidity
error DateOutOfBounds(uint64 limit, uint64 actual) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `limit` | `uint64` | The limit value. |
| `actual` | `uint64` | The actual value. |

###  error MinDurationOutOfBounds

Thrown if the minimal duration value is out of bounds (less than one hour or greater than 1 year).

```solidity
error MinDurationOutOfBounds(uint64 limit, uint64 actual) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `limit` | `uint64` | The limit value. |
| `actual` | `uint64` | The actual value. |

###  error ProposalCreationForbidden

Thrown when a sender is not allowed to create a proposal.

```solidity
error ProposalCreationForbidden(address sender) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `sender` | `address` | The sender address. |

###  error VoteCastForbidden

Thrown if an account is not allowed to cast a vote. This can be because the vote
- has not started,
- has ended,
- was executed, or
- the account doesn't have voting powers.

```solidity
error VoteCastForbidden(uint256 proposalId, address account, enum IMajorityVoting.VoteOption voteOption) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `proposalId` | `uint256` | The ID of the proposal. |
| `account` | `address` | The address of the _account. |
| `voteOption` | `enum IMajorityVoting.VoteOption` | The chosen vote option. |

###  error ProposalExecutionForbidden

Thrown if the proposal execution is forbidden.

```solidity
error ProposalExecutionForbidden(uint256 proposalId) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `proposalId` | `uint256` | The ID of the proposal. |

###  event VotingSettingsUpdated

Emitted when the voting settings are updated.

```solidity
event VotingSettingsUpdated(enum MajorityVotingBase.VotingMode votingMode, uint32 supportThreshold, uint32 minParticipation, uint64 minDuration, uint256 minProposerVotingPower) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `votingMode` | `enum MajorityVotingBase.VotingMode` | A parameter to select the vote mode. |
| `supportThreshold` | `uint32` | The support threshold value. |
| `minParticipation` | `uint32` | The minimum participation value. |
| `minDuration` | `uint64` | The minimum duration of the proposal vote in seconds. |
| `minProposerVotingPower` | `uint256` | The minimum voting power required to create a proposal. |

### internal function __MajorityVotingBase_init

Initializes the component to be used by inheriting contracts.

```solidity
function __MajorityVotingBase_init(contract IDAO _dao, struct MajorityVotingBase.VotingSettings _votingSettings) internal 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `contract IDAO` | The IDAO interface of the associated DAO. |
| `_votingSettings` | `struct MajorityVotingBase.VotingSettings` | The voting settings. |

*This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).*
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

### public function vote

Votes for a vote option and, optionally, executes the proposal.

```solidity
function vote(uint256 _proposalId, enum IMajorityVoting.VoteOption _voteOption, bool _tryEarlyExecution) public virtual 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| `_voteOption` | `enum IMajorityVoting.VoteOption` | The chosen vote option. |
| `_tryEarlyExecution` | `bool` | If `true`,  early execution is tried after the vote cast. The call does not revert if early execution is not possible. |

*`_voteOption`, 1 -> abstain, 2 -> yes, 3 -> no*
### public function execute

Executes a proposal.

```solidity
function execute(uint256 _proposalId) public virtual 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal to be executed. |

### public function getVoteOption

Returns whether the account has voted for the proposal.  Note, that this does not check if the account has voting power.

```solidity
function getVoteOption(uint256 _proposalId, address _voter) public view virtual returns (enum IMajorityVoting.VoteOption) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| `_voter` | `address` |  |
| **Output** | |
|  `0`  | `enum IMajorityVoting.VoteOption` | The vote option cast by a voter for a certain proposal. |

### public function canVote

Checks if an account can participate on a proposal vote. This can be because the vote
- has not started,
- has ended,
- was executed, or
- the voter doesn't have voting powers.

```solidity
function canVote(uint256 _proposalId, address _voter, enum IMajorityVoting.VoteOption _voteOption) public view virtual returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The proposal Id. |
| `_voter` | `address` |  |
| `_voteOption` | `enum IMajorityVoting.VoteOption` | Whether the voter abstains, supports or opposes the proposal. |
| **Output** | |
|  `0`  | `bool` | Returns true if the account is allowed to vote. |

*The function assumes the queried proposal exists.*
### public function canExecute

Checks if a proposal can be executed.

```solidity
function canExecute(uint256 _proposalId) public view virtual returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal to be checked. |
| **Output** | |
|  `0`  | `bool` | True if the proposal can be executed, false otherwise. |

### public function isSupportThresholdReached

Checks if the support value defined as $$\texttt{support} = \frac{N_\text{yes}}{N_\text{yes}+N_\text{no}}$$ for a proposal vote is greater than the support threshold.

```solidity
function isSupportThresholdReached(uint256 _proposalId) public view virtual returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| **Output** | |
|  `0`  | `bool` | Returns `true` if the  support is greater than the support threshold and `false` otherwise. |

### public function isSupportThresholdReachedEarly

Checks if the worst-case support value defined as $$\texttt{worstCaseSupport} = \frac{N_\text{yes}}{ N_\text{total}-N_\text{abstain}}$$ for a proposal vote is greater than the support threshold.

```solidity
function isSupportThresholdReachedEarly(uint256 _proposalId) public view virtual returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| **Output** | |
|  `0`  | `bool` | Returns `true` if the worst-case support is greater than the support threshold and `false` otherwise. |

### public function isMinParticipationReached

Checks if the participation value defined as $$\texttt{participation} = \frac{N_\text{yes}+N_\text{no}+N_\text{abstain}}{N_\text{total}}$$ for a proposal vote is greater or equal than the minimum participation value.

```solidity
function isMinParticipationReached(uint256 _proposalId) public view virtual returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| **Output** | |
|  `0`  | `bool` | Returns `true` if the participation is greater than the minimum participation and `false` otherwise. |

### public function supportThreshold

Returns the support threshold parameter stored in the voting settings.

```solidity
function supportThreshold() public view virtual returns (uint32) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `uint32` | The support threshold parameter. |

### public function minParticipation

Returns the minimum participation parameter stored in the voting settings.

```solidity
function minParticipation() public view virtual returns (uint32) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `uint32` | The minimum participation parameter. |

### public function minDuration

Returns the minimum duration parameter stored in the voting settings.

```solidity
function minDuration() public view virtual returns (uint64) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `uint64` | The minimum duration parameter. |

### public function minProposerVotingPower

Returns the minimum voting power required to create a proposal stored in the voting settings.

```solidity
function minProposerVotingPower() public view virtual returns (uint256) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `uint256` | The minimum voting power required to create a proposal. |

### public function votingMode

Returns the vote mode stored in the voting settings.

```solidity
function votingMode() public view virtual returns (enum MajorityVotingBase.VotingMode) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `enum MajorityVotingBase.VotingMode` | The vote mode parameter. |

### public function totalVotingPower

Returns the total voting power checkpointed for a specific block number.

```solidity
function totalVotingPower(uint256 _blockNumber) public view virtual returns (uint256) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_blockNumber` | `uint256` | The block number. |
| **Output** | |
|  `0`  | `uint256` | The total voting power. |

### public function getProposal

Returns all information for a proposal vote by its ID.

```solidity
function getProposal(uint256 _proposalId) public view virtual returns (bool open, bool executed, struct MajorityVotingBase.ProposalParameters parameters, struct MajorityVotingBase.Tally tally, struct IDAO.Action[] actions, uint256 allowFailureMap) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| **Output** | |
|  `open`  | `bool` | Whether the proposal is open or not. |
|  `executed`  | `bool` | Whether the proposal is executed or not. |
|  `parameters`  | `struct MajorityVotingBase.ProposalParameters` | The parameters of the proposal vote. |
|  `tally`  | `struct MajorityVotingBase.Tally` | The current tally of the proposal vote. |
|  `actions`  | `struct IDAO.Action[]` | The actions to be executed in the associated DAO after the proposal has passed. |
|  `allowFailureMap`  | `uint256` | The bit map representations of which actions are allowed to revert so tx still succeeds. |

### external function updateVotingSettings

Updates the voting settings.

```solidity
function updateVotingSettings(struct MajorityVotingBase.VotingSettings _votingSettings) external virtual 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_votingSettings` | `struct MajorityVotingBase.VotingSettings` | The new voting settings. |

### external function createProposal

Creates a new majority voting proposal.

```solidity
function createProposal(bytes _metadata, struct IDAO.Action[] _actions, uint256 _allowFailureMap, uint64 _startDate, uint64 _endDate, enum IMajorityVoting.VoteOption _voteOption, bool _tryEarlyExecution) external virtual returns (uint256 proposalId) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_metadata` | `bytes` | The metadata of the proposal. |
| `_actions` | `struct IDAO.Action[]` | The actions that will be executed after the proposal passes. |
| `_allowFailureMap` | `uint256` | Allows proposal to succeed even if an action reverts. Uses bitmap representation. If the bit at index `x` is 1, the tx succeeds even if the action at `x` failed. Passing 0 will be treated as atomic execution. |
| `_startDate` | `uint64` | The start date of the proposal vote. If 0, the current timestamp is used and the vote starts immediately. |
| `_endDate` | `uint64` | The end date of the proposal vote. If 0, `_startDate + minDuration` is used. |
| `_voteOption` | `enum IMajorityVoting.VoteOption` | The chosen vote option to be casted on proposal creation. |
| `_tryEarlyExecution` | `bool` | If `true`,  early execution is tried after the vote cast. The call does not revert if early execution is not possible. |
| **Output** | |
|  `proposalId`  | `uint256` | The ID of the proposal. |

### internal function _vote

Internal function to cast a vote. It assumes the queried vote exists.

```solidity
function _vote(uint256 _proposalId, enum IMajorityVoting.VoteOption _voteOption, address _voter, bool _tryEarlyExecution) internal virtual 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| `_voteOption` | `enum IMajorityVoting.VoteOption` | The chosen vote option to be casted on the proposal vote. |
| `_voter` | `address` |  |
| `_tryEarlyExecution` | `bool` | If `true`,  early execution is tried after the vote cast. The call does not revert if early execution is not possible. |

### internal function _execute

Internal function to execute a vote. It assumes the queried proposal exists.

```solidity
function _execute(uint256 _proposalId) internal virtual 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |

### internal function _canVote

Internal function to check if a voter can vote. It assumes the queried proposal exists.

```solidity
function _canVote(uint256 _proposalId, address _voter, enum IMajorityVoting.VoteOption _voteOption) internal view virtual returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| `_voter` | `address` | The address of the voter to check. |
| `_voteOption` | `enum IMajorityVoting.VoteOption` | Whether the voter abstains, supports or opposes the proposal. |
| **Output** | |
|  `0`  | `bool` | Returns `true` if the given voter can vote on a certain proposal and `false` otherwise. |

### internal function _canExecute

Internal function to check if a proposal can be executed. It assumes the queried proposal exists.

```solidity
function _canExecute(uint256 _proposalId) internal view virtual returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| **Output** | |
|  `0`  | `bool` | True if the proposal can be executed, false otherwise. |

*Threshold and minimal values are compared with `>` and `>=` comparators, respectively.*
### internal function _isProposalOpen

Internal function to check if a proposal vote is still open.

```solidity
function _isProposalOpen(struct MajorityVotingBase.Proposal proposal_) internal view virtual returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `proposal_` | `struct MajorityVotingBase.Proposal` | The proposal struct. |
| **Output** | |
|  `0`  | `bool` | True if the proposal vote is open, false otherwise. |

### internal function _updateVotingSettings

Internal function to update the plugin-wide proposal vote settings.

```solidity
function _updateVotingSettings(struct MajorityVotingBase.VotingSettings _votingSettings) internal virtual 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_votingSettings` | `struct MajorityVotingBase.VotingSettings` | The voting settings to be validated and updated. |

### internal function _validateProposalDates

Validates and returns the proposal vote dates.

```solidity
function _validateProposalDates(uint64 _start, uint64 _end) internal view virtual returns (uint64 startDate, uint64 endDate) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_start` | `uint64` | The start date of the proposal vote. If 0, the current timestamp is used and the vote starts immediately. |
| `_end` | `uint64` | The end date of the proposal vote. If 0, `_start + minDuration` is used. |
| **Output** | |
|  `startDate`  | `uint64` | The validated start date of the proposal vote. |
|  `endDate`  | `uint64` | The validated end date of the proposal vote. |

<!--CONTRACT_END-->

