# Aragon Core Contracts

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [UPCOMING]

### Added

- Added `AddressListVotingManager` & `Erc20VotingManager`.
- Added `AragonPlugin` and `AragonUpgradablePlugin` for the devs to inherit from for their concrete plugin implementations.
- Added Multi Target Bulk Permission object for `PermissionManager` with the oracle option as well.
- Added Abstract `PluginManager` for the devs to inherit from for their concrete plugin manager implementation.
- Added the `solidity-docgen` hardhat plugin by OpenZepplin to automatically generate documentation via `yarn docgen`.
- Added deployment script for `ENSSubdomainRegistrar`.
- Added `ENSSubdomainRegistrar` `Component` to register subdomains at the ENS.
- Added `IPluginRepo` interface for plugin PluginRepo contract.
- Added `PluginRepo` contract.
- Added `InterfaceBasedRegistry` base to be used for creating any ERC165-based registry such as DAO-Registry and `AragonPluginRegistry`.
- Added `AragonPluginRegistry` contract for registering `PluginRepo`s.
- Added `PluginRepoFactory` contract for creating `PluginRepo`s.
- Added testing for `PluginRepo`, `InterfaceBasedRegistry`, `AragonPluginRegistry` and `PluginRepoFactory`.
- Added deployment script for `managing-dao`, `plugin-registry` and `pluginRepo-factory`.
- Added an abstract `ERC165RegistryBase` `Component` to register contracts by their address based on their ERC165 interface ID.
- Added a concrete `ERC165Registry` implementation.

### Changed

- Updated deploy script to correctly use `ERC1967Proxy`.
- Renamed `hasPermission` to `isGranted` in both `PermissionManager` and `IPermissionOracle`.
- Renamed several contracts, methods, variables, and constants as well as associated folder names.
- Updated deployment scripts for `managing-dao`, `dao-registry`, `aragon-plugin-registry`, `dao-factory`.
- Changed `registry.ts` to `dao-registry.ts` and updated testing.
- Changed `Registry` to `DAORegistry` and updated to inherit from `InterfaceBasedRegistry`.
- Bumped `@openzeppelin/contracts` and `@openzeppelin/contracts-upgradeable` to `4.7.0` and fixed `GovernanceWrappedERC20` accordingly.
- Refactored import statements.
- Changed `ERC165RegistryBase` to `InterfaceBasedRegistry`.
- Changed order of deployment scripts.
- Changed folder struction of tests.
- Refactored event names and NatSpec comments.

### Removed

- Removed restrictions regarding plugin's address in `PluginRepo`.
- Removed `deepEqual` overwrite of `equal` property in Chai Assertion used for testing of emitted events.
- Removed `ERC165Registry`.

## v0.2.0-alpha

### Added

- Added tests for the `ACL` and `IACLOracle`.
- Allow tokens to be minted to DAO's treasury by passing address(0) as receiver in `TokenFactory`.

### Changed

- Generalized `MerkleMinter` and made it a `MetaTxComponent`.
- Generalized `MerkleDistributor` and made it a `MetaTxComponent`.

### Removed

## v0.1.0-alpha

### Added

- Added workflow and scripts in `.github/helpers/contracts/dummy-dao/` to create dummy daos, deposits and proposals on contract deploy.
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
