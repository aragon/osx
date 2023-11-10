
## Description

The on-chain multisig governance plugin in which a proposal passes if X out of Y approvals are met.

## Implementation

### public struct Proposal

```solidity
struct Proposal {
  bool executed;
  uint16 approvals;
  struct Multisig.ProposalParameters parameters;
  mapping(address => bool) approvers;
  struct IDAO.Action[] actions;
  uint256 allowFailureMap;
}
```
### public struct ProposalParameters

```solidity
struct ProposalParameters {
  uint16 minApprovals;
  uint64 snapshotBlock;
  uint64 startDate;
  uint64 endDate;
}
```
### public struct MultisigSettings

```solidity
struct MultisigSettings {
  bool onlyListed;
  uint16 minApprovals;
}
```
### internal variable MULTISIG_INTERFACE_ID

The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.

```solidity
bytes4 MULTISIG_INTERFACE_ID 
```

### public variable UPDATE_MULTISIG_SETTINGS_PERMISSION_ID

The ID of the permission required to call the `addAddresses` and `removeAddresses` functions.

```solidity
bytes32 UPDATE_MULTISIG_SETTINGS_PERMISSION_ID 
```

### internal variable proposals

A mapping between proposal IDs and proposal information.

```solidity
mapping(uint256 => struct Multisig.Proposal) proposals 
```

### public variable multisigSettings

The current plugin settings.

```solidity
struct Multisig.MultisigSettings multisigSettings 
```

### public variable lastMultisigSettingsChange

Keeps track at which block number the multisig settings have been changed the last time.

```solidity
uint64 lastMultisigSettingsChange 
```

*This variable prevents a proposal from being created in the same block in which the multisig settings change.*
###  error ProposalCreationForbidden

Thrown when a sender is not allowed to create a proposal.

```solidity
error ProposalCreationForbidden(address sender) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `sender` | `address` | The sender address. |

###  error ApprovalCastForbidden

Thrown if an approver is not allowed to cast an approve. This can be because the proposal
- is not open,
- was executed, or
- the approver is not on the address list

```solidity
error ApprovalCastForbidden(uint256 proposalId, address sender) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `proposalId` | `uint256` | The ID of the proposal. |
| `sender` | `address` | The address of the sender. |

###  error ProposalExecutionForbidden

Thrown if the proposal execution is forbidden.

```solidity
error ProposalExecutionForbidden(uint256 proposalId) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `proposalId` | `uint256` | The ID of the proposal. |

###  error MinApprovalsOutOfBounds

Thrown if the minimal approvals value is out of bounds (less than 1 or greater than the number of members in the address list).

```solidity
error MinApprovalsOutOfBounds(uint16 limit, uint16 actual) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `limit` | `uint16` | The maximal value. |
| `actual` | `uint16` | The actual value. |

###  error AddresslistLengthOutOfBounds

Thrown if the address list length is out of bounds.

```solidity
error AddresslistLengthOutOfBounds(uint16 limit, uint256 actual) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `limit` | `uint16` | The limit value. |
| `actual` | `uint256` | The actual value. |

###  error DateOutOfBounds

Thrown if a date is out of bounds.

```solidity
error DateOutOfBounds(uint64 limit, uint64 actual) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `limit` | `uint64` | The limit value. |
| `actual` | `uint64` | The actual value. |

###  event Approved

Emitted when a proposal is approve by an approver.

```solidity
event Approved(uint256 proposalId, address approver) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `proposalId` | `uint256` | The ID of the proposal. |
| `approver` | `address` | The approver casting the approve. |

###  event MultisigSettingsUpdated

Emitted when the plugin settings are set.

```solidity
event MultisigSettingsUpdated(bool onlyListed, uint16 minApprovals) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `onlyListed` | `bool` | Whether only listed addresses can create a proposal. |
| `minApprovals` | `uint16` | The minimum amount of approvals needed to pass a proposal. |

### external function initialize

Initializes Release 1, Build 2.

```solidity
function initialize(contract IDAO _dao, address[] _members, struct Multisig.MultisigSettings _multisigSettings) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `contract IDAO` | The IDAO interface of the associated DAO. |
| `_members` | `address[]` | The addresses of the initial members to be added. |
| `_multisigSettings` | `struct Multisig.MultisigSettings` | The multisig settings. |

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

### external function updateMultisigSettings

Updates the plugin settings.

```solidity
function updateMultisigSettings(struct Multisig.MultisigSettings _multisigSettings) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_multisigSettings` | `struct Multisig.MultisigSettings` | The new settings. |

### external function createProposal

Creates a new multisig proposal.

```solidity
function createProposal(bytes _metadata, struct IDAO.Action[] _actions, uint256 _allowFailureMap, bool _approveProposal, bool _tryExecution, uint64 _startDate, uint64 _endDate) external returns (uint256 proposalId) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_metadata` | `bytes` | The metadata of the proposal. |
| `_actions` | `struct IDAO.Action[]` | The actions that will be executed after the proposal passes. |
| `_allowFailureMap` | `uint256` | A bitmap allowing the proposal to succeed, even if individual actions might revert. If the bit at index `i` is 1, the proposal succeeds even if the `i`th action reverts. A failure map value of 0 requires every action to not revert. |
| `_approveProposal` | `bool` | If `true`, the sender will approve the proposal. |
| `_tryExecution` | `bool` | If `true`, execution is tried after the vote cast. The call does not revert if early execution is not possible. |
| `_startDate` | `uint64` | The start date of the proposal. |
| `_endDate` | `uint64` | The end date of the proposal. |
| **Output** | |
|  `proposalId`  | `uint256` | The ID of the proposal. |

### public function approve

Approves and, optionally, executes the proposal.

```solidity
function approve(uint256 _proposalId, bool _tryExecution) public 
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

### public function getProposal

Returns all information for a proposal vote by its ID.

```solidity
function getProposal(uint256 _proposalId) public view returns (bool executed, uint16 approvals, struct Multisig.ProposalParameters parameters, struct IDAO.Action[] actions, uint256 allowFailureMap) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| **Output** | |
|  `executed`  | `bool` | Whether the proposal is executed or not. |
|  `approvals`  | `uint16` | The number of approvals casted. |
|  `parameters`  | `struct Multisig.ProposalParameters` | The parameters of the proposal vote. |
|  `actions`  | `struct IDAO.Action[]` | The actions to be executed in the associated DAO after the proposal has passed. |
|  `allowFailureMap`  | `uint256` |  |

### public function hasApproved

Returns whether the account has approved the proposal. Note, that this does not check if the account is listed.

```solidity
function hasApproved(uint256 _proposalId, address _account) public view returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| `_account` | `address` | The account address to be checked. |
| **Output** | |
|  `0`  | `bool` | The vote option cast by a voter for a certain proposal. |

### public function execute

Executes a proposal.

```solidity
function execute(uint256 _proposalId) public 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal to be executed. |

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
### internal function _execute

Internal function to execute a vote. It assumes the queried proposal exists.

```solidity
function _execute(uint256 _proposalId) internal 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |

### internal function _canApprove

Internal function to check if an account can approve. It assumes the queried proposal exists.

```solidity
function _canApprove(uint256 _proposalId, address _account) internal view returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| `_account` | `address` | The account to check. |
| **Output** | |
|  `0`  | `bool` | Returns `true` if the given account can approve on a certain proposal and `false` otherwise. |

### internal function _canExecute

Internal function to check if a proposal can be executed. It assumes the queried proposal exists.

```solidity
function _canExecute(uint256 _proposalId) internal view returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_proposalId` | `uint256` | The ID of the proposal. |
| **Output** | |
|  `0`  | `bool` | Returns `true` if the proposal can be executed and `false` otherwise. |

### internal function _isProposalOpen

Internal function to check if a proposal vote is still open.

```solidity
function _isProposalOpen(struct Multisig.Proposal proposal_) internal view returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `proposal_` | `struct Multisig.Proposal` | The proposal struct. |
| **Output** | |
|  `0`  | `bool` | True if the proposal vote is open, false otherwise. |

### internal function _updateMultisigSettings

Internal function to update the plugin settings.

```solidity
function _updateMultisigSettings(struct Multisig.MultisigSettings _multisigSettings) internal 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_multisigSettings` | `struct Multisig.MultisigSettings` | The new settings. |

<!--CONTRACT_END-->

