# Aragon Core Contracts

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v0.2.0-alpha

### Added

### Changed

- Generalized `MerkleDistributor` and made it a `MetaTxComponent`

### Removed

## v0.1.0-alpha

### Added

- added workflow and scripts in `.github/helpers/contracts/dummy-dao/` to create dummy daos, deposits and proposals on contract deploy
- Added `VoteConfig` struct in the `DAOFactory` to allow better typechain support for the creation of daos.
- Added `MetaTxComponent`.

### Changed

- Renamed the event `SetMetadata` to `MetadataSet`
- Completed the `IDAO` interface and changed `DAO` accordingly
- Decoupled `Permissions` from `BaseRelayRecipient`.
- Fixed OZ contracts-upgradable `Initializable`.

### Removed

- Removed `Relay` interface from `Permissions.sol`.

## v0.0.1-alpha

### Added

- First version of the package, exposing the JSON artifacts.
