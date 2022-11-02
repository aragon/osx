# Aragon Core Subgraph

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [UPCOMING]

### Added

- Adds support for `PluginRepo`, `PluginRegistry` and `PluginSetupProcessor`
- Added `Withdrawn`, `TrustedForwarderSet`, `StandardCallbackRegistered` and `handleStandardCallbackRegistered` events handling to `DaoTemplate`

### Changed

- improved test recompiliation
- marks some entity as immutable

## 0.4.0-alpha

On 2022-10-07 15:20:00

### Added

- `executable` property to `ERC20VotingProposal` and `AllowlistProposal`.

## 0.2.1-alpha

On 2022-10-03 10:38:36

### Added
- Added `members` to `ERC20VotingPackage`.
- Added `lastUpdated` to `ERC20VotingVoter`.
- added `voteCount` to both `ERC20VotingProposal` and `AllowlistProposal`.
- addes type field to `VaultTransfer` to differntiate between deposits and withdraws

### Changed

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
