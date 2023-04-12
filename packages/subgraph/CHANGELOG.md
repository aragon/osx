# Aragon OSx Subgraph

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [UPCOMING]

### Changed

- Supports now multiple `DAORegistries`, `PluginRepoRegistries` and `PluginSetupProcessors` as datasources.
- Splits `DAO` into multiple versions.
- Fixes typing issues in tests and subgraph manifest.

## [1.1.0]

### Added

- Added `method-classes`.
- Added `schema-extender.ts`.
- Added `installations` to `IPlugin`.
- Added `PluginRelease`.
- Added `metadata` to `PluginVersion`.
- Added configuration for mumbai.

### Changed

- Changed `executable` attribute of the proposal entities to `potentiallyExecutable`.
- Changed `plugin` field of `Dao` from `IPluginInstallation` to `IPlugin`.
- Changed `pluginAddress` field of `PluginInstallation` to `plugin`.
- Changed `IPluginInstallation` to `IPlugin`.
- Changed `release: Int!` to `release: PluginRelease!` in `PluginVersion`
- Changed `versions` to `releases` in `PluginRepo`.
- Changes `Permission` entity to be muteable.

### Removed

- Removed `pluginInstallations` from `Dao`.

## [1.0.1]

### Added

- Add `executable` attribute to `MultisigProposal`.
- Added `subdomain_blocklist` for DAO indexing.

### Changed

- Changed `minApprovals` to int on `MultisigPlugin`.
- Changed proposal entity id to `bytes32` from `bigint`.
- Fixed the `supportThresholdReachedEarly` check in `handleVoteCast` of `TokenVoting` and `AddresslistVoting`.

## 0.9.0-alpha

On 2023-02-16 16:23:28

## 0.7.1-alpha

### Added

- Adds support for AdminPlugin members by listening on DAO permissions.

### Changed

- Changes all instances of `adminstrator` to `administrator` to fix typo.

## 0.7.0-alpha

### Added

- Added the `MembershipContractAnnounced` event.
- Added `executionTxHash` to `AddresslistVotingProposal`, `TokenVotingProposal`, `MultisigProposal` and `AdminProposal`.
- Added `voteReplaced` and `updatedAt` to `TokenVotingVote` and `AddresslistVotingVote`.
- Adds entities: `PluginPermission`, `PluginPreparation`.
- Adds enums: `PermissionOperation`, `PluginPreparationType`.

### Changed

- Changed the folder structure of the `contracts` folder.
- Changed indexing of `totalVotingPower` which is now obtained from the `snapshotBlock` and the public function `totalVotingPower(uint256 _blockNumber)`.
- Renamed the `AddressesAdded` and `AddressesRemoved` event to `MembersAdded` and `MembersRemoved`.
- Changes `callId` in `Executed` event from `uint256` to `bytes32`.
- Renames `name` in `PluginRepoRegistry` and `DAORegistry` to `subdomain`.
- Removes `DaoPlugin` entity.
- Removes `daos` field from Plugin entities.

### Fixed

- Applied changes made in the `PluginSetupProcessor`.

## 0.6.2-alpha

### Added

- Added `startDate` and `endDate` to all `ProposalCreated` events.
- Adds `startDate` and `endDate` fields to Multisig proposals.
- Adds `allowFailureMap` to the proposal entities.

### Changed

- Replaced `ProposalParameters.minParticipation` by `minVotingPower` in `TokenVoting` and `AddresslistVoting`.
- Rescaled and renamed `PCT_BASE = 10**18` to `RATIO_BASE = 10**6`.
- Changed the type of `ProposalParameter.minApprovals`, `MultisigSettingsUpdated.minApprovals` from `uint256` to `uint16` , and added `approvals`(uint16) in the `Proposal` struct.
- Updates `ADDRESSLIST_VOTING_INTERFACE` and `ADMIN_INTERFACE`
- Changed all occurences of `oracle` to `condition`.

### Removed

- Removes `Tally` struct as well as `addressListLength` and moves `approvals` in `Proposal`.

## 0.6.1-alpha

On 2023-01-11 17:06:50

### Changed

- Ignores `None` votes from addresslist voting and token voting
- Updates `MULTISIG_INTERFACE`

### Removed

- Removes `open` and `executable` fields from Multisig proposals
- Removed `withdraw` event handling.

## 0.5.0-alpha

On 2022-12-09 15:16:22

### Added

- Added support for the `AdminPlugin`.
- Fixed the early execution criterion in `MajorityVoting` by calculating the `worstCaseSupport` quantity.
- Adds support for `PluginRepo`, `PluginRegistry` and `PluginSetupProcessor`
- Added `Withdrawn`, `TrustedForwarderSet`, `StandardCallbackRegistered` and `handleStandardCallbackRegistered` events handling to `DaoTemplate`
- Added support for the new `PluginSettingsUpdated` event of the `Multisig` plugin

### Changed

- Unified naming of the `MajorityVoting` related variables and functions as well as reordering of the function arguments.
- Changed `MajorityVoting` to use `minParticipation` and unified the parameter order.
- Renamed *package to *plugin.
- Renamed Allowlist to Addresslist.
- Improved test recompilation.
- Marks some entity as immutable.
- Fixes calcuation crash in erc20 voting, when no votes were cast
- Added the field `onlyListed` to the `MultisigPlugin` type

## 0.4.0-alpha

On 2022-10-07 15:20:00

### Added

- `executable` property to `ERC20VotingProposal` and `AllowlistProposal`.

## 0.2.1-alpha

On 2022-10-03 10:38:36

### Added

- Added an `ERC721Token` entity and `Token` interface to be used by `TokenVotingPlugin`.
- Added `members` to `ERC20VotingPackage`.
- Added `lastUpdated` to `ERC20VotingVoter`.
- Added `voteCount` to both `ERC20VotingProposal` and `AllowlistProposal`.
- Added type field to `VaultTransfer` to differentiate between deposits and withdraws

### Changed

- Renamed contracts, events, and parameters in `MajorityVoting`:
  - `ERC20Voting` to `TokenVoting`
  - `AllowlistVoting` to `AddresslistVoting` and `allowlist` to `addresslist`
  - `VoteCreated` and `VoteExecuted` to `ProposalCreated` and `ProposalExecuted`
  - `voteId` to `proposalId`
- Changed `users` to `members` in `AllowlistPackage`.
- Adapted subgraph names according to the renaming of the contracts.
- Updated `manifest`, `registry`, `registry.test`.
- Refactored import statements.
- Refactored event names.
- Refactored `deposits` and `withdraws` into one field `transfers`.
- Refactored `VaultWithdraw` and `VaultDeposit` into one type `VaultTransfer`.
- Removes not null enforcing `Proposal.metadata`.

## v0.2.0-alpha

### Added

- Remove decoding `metadata` hash from Subgraph.
- Expand `Proposal` entity to include `creator`, `metadata` and `createdAt`.

### Changed

### Removed

## v0.1.0-alpha

### Added

- Implement mapping and unit testing for events of `MetaTxComponent`.
- Utilizing interfaceId for distinguishing between `ERC20Voting` and `WhitelistVoting`.
- Added eslint.

### Changed

- Renamed the event `SetMetadata` to `MetadataSet`
- Updated Subgraph to adapt to the changes in the core contracts.
- Refactored subgraph's unit testing, applying clean code standards.

## v0.0.1-alpha

### Added

- First version of the package.
- Mapping all the main events of the core contracts.
- Mapping all the main events of both `ERC20Voting` and `WhitelistVoting`.
