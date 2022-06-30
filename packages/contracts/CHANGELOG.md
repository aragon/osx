# Aragon Core Contracts

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [UPCOMING]

### Added

- Added `IPluginFactory` abstract contract to be used in developing a pluginfactory.
- Added `IPluginRepo` interface for plugin PluginRepo contract.
- Added `PluginRepo` contract.
- Added `InterfaceBasedRegistry` base to be used for creating any ERC165-based registry such as DAO-Registry and `AragonPluginRegistry`.
- Added `AragonPluginRegistry` contract for registering `PluginRepo`s.
- Added `PluginRepoFactory` contract for creating `PluginRepo`s.
- Added testing for `PluginRepo`, `InterfaceBasedRegistry`, `AragonPluginRegistry` and `PluginRepoFactory`.
- Added deployment script for `admin-dao`, `apm-registry` and `pluginRepo-factory`.
- Added an abstract `ERC165RegistryBase` `Component` to register contracts by their address based on their ERC165 interface ID.
- Added a concrete `ERC165Registry` implementation.

### Changed

- Changed `ERC165RegistryBase` to `InterfaceBasedRegistry`
- Changed order of deployment scripts
- Changed folder struction of tests
- Refactored event names and NatSpec comments

### Removed

- Removed `deepEqual` overwrite of `equal` property in Chai Assertion used for testing of emitted events
- Removed `ERC165Registry`

## v0.2.0-alpha

### Added

- Added tests for the `ACL` and `IACLOracle`
- Allow tokens to be minted to DAO's treasury by passing address(0) as receiver in `TokenFactory`.

### Changed

- Generalized `MerkleMinter` and made it a `MetaTxComponent`.
- Generalized `MerkleDistributor` and made it a `MetaTxComponent`.

### Removed

## v0.1.0-alpha

### Added

- Added workflow and scripts in `.github/helpers/contracts/dummy-dao/` to create dummy daos, deposits and proposals on contract deploy
- Added `VoteConfig` struct in the `DAOFactory` to allow better typechain support for the creation of daos.
- Added `MetaTxComponent`.

### Changed

- Renamed the event `SetMetadata` to `MetadataSet`.
- Completed the `IDAO` interface and changed `DAO` accordingly.
- Decoupled `Permissions` from `BaseRelayRecipient`.
- Fixed OZ contracts-upgradable `Initializable`.

### Removed

- Removed `Relay` interface from `Permissions.sol`.

## v0.0.1-alpha

### Added

- First version of the package, exposing the JSON artifacts.
