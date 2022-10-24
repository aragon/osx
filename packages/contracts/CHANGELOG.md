# Aragon Core Contracts

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [UPCOMING]

### Added

- Transferred the core docs from aragon/builders-portal to this repository.
- Added `AllowlistVotingSetup` and `ERC20VotingSetup`.
- Added utility functions (`deployPluginRepoRegistry`, `deployPluginSetupProcessor`, `deployPluginRepoFactory`, and `filterEvents`) to the test suite.
- Added `DaoAuthorizableBase` class.
- Added `DaoAuthorizableClonable` using OpenZepplin initialization.
- Added mocks and tests for the `Plugin` and `PluginSetup` classes.
- Added `PluginSetupProcessor` to be the main class processing `PluginSetup` contracts and applying permissions in the installing DAO.
- Added `DaoAuthorizableUpgradeable` and a free `_auth` function to provide an `auth` modifier to the different plugin types and prevent code duplication.
- Added `PluginCloneable`, `PluginTransparentUpgradeable`.
- Added goerli configuration to deploy to the Goerli testnet.
- Added `AragonPlugin` and `AragonUpgradeablePlugin` for developers to inherit from for their concrete plugin implementations.
- Added helper function `test/test-utils/ens.ts` deploying the `ENSSubdomainRegistrar` and `ENS`-related contracts.
- Added Multi Target Bulk Permission object for `PermissionManager` with the oracle option as well.
- Added Abstract `PluginSetup` for the devs to inherit from for their concrete plugin manager implementation.
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
- Added ENS support for `PluginRepoRegistry`.

### Changed

- Renamed `UPGRADE_PERMISSION` to be more specific to `UPGRADE_DAO_PERMISSION`, `UPGRADE_PLUGIN_PERMISSION`, etc.
- Refactored `DAOFactory`to use`PluginSetupProcessor`.
- Refactored NatSpec comments and names for the contracts related to the `Plugin` and `PluginSetup`.
- Renamed `PluginTransparentUpgradeable` to `PluginUpgradeable`.
- Refactored `AdaptiveERC165` into an independent `CallbackHandler` contract and separated `ERC165` from it.
- Adapted `Component` to use `DaoAuthorizableUpgradeable` until it is fully refactored to become `Plugin`.
- Refactored `DaoAuthorizable` to use the newly introduced, free `_auth` function to prevent code duplication.
- Improved `Counter` examples and added respective `PluginSetup` example contracts.
- Renamed `PluginManager` to `PluginSetup` and refactored it to be a two-transaction process consisting of a `prepare` and an `apply` step.
- Replaced `AragonPlugin` and `AragonUpgradeablePlugin` by `Plugin` and `PluginUUPSUpgradeable`, respectively.
- Changed `DAORegistry` to use the `ENSSubdomainRegistrar` so that a DAO name can only be registered once.
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
- Changed folder structure of tests.
- Refactored event names and NatSpec comments.
- Renamed `TestComponent`, `TestSharedComponent` to `TestPlugin`, `TestPluginComponent`.
- Renamed `createProxy` function to `createERC1967Proxy`.
- Replaces custom ERC1271 interface with Openzeppelins interface.

### Removed

- Removed `AppStorage` and related helpers `PluginERC1967Proxy`, `TransparentProxy`.
- Removed `PluginConstants` that were related to the previous, indexd plugin setup solution.
- Removed restrictions regarding plugin's address in `PluginRepo`.
- Removed `deepEqual` overwrite of `equal` property in Chai Assertion used for testing of emitted events.
- Removed `ERC165Registry`.
- Removed `Component` and `MetaTxComponent`.

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
- Fixed OZ contracts-upgradeable `Initializable`.

### Removed

- Removed `Relay` interface from `Permissions.sol`.

## v0.0.1-alpha

### Added

- First version of the package, exposing the JSON artifacts.
