# Aragon Core Subgraph

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [UPCOMING]

### Changed
- Renamed folders
  - `votings` to `voting`
  - `ERC20` to `erc20`
  - `whitelist` to `allowlist`
- Renamed files and contracts
  - `Whitelist` to `Allowlist`
  - `whitelistVoting` to `allowlist-voting`
  - `erc20Voting` to `erc20-voting`
- Renamed variables
  - `voterState` to `voteOption`
  - `voterWeight` to `voteWeight`
- Renamed enums
  - `VoterState` to `VoteOption`
  - `Yea` to `Yes`
  - `Nay` to `No`
- Renamed methods
  - `newVote` to `createVote`
- Refactored import statements.
- Refactored event names.
  
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
