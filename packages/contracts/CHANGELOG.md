# Aragon Core Contracts

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v0.1.0-alpha

### Added

- Implement getter function `getVotingToken` in `ERC20Voting`.
- Added `VoteConfig` struct in the `DAOFactory` to allow better typechain support for the creation of daos.

### Changed

- Set `votingToken` to private, to allow for registering ERC20Voting interfaceId.

## v0.0.1-alpha

### Added

- First version of the package, exposing the JSON artifacts
