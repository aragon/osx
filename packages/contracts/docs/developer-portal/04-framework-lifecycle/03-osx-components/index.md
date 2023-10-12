# Contracts of Aragon OSX

<div class="center-column">

![UML diagram of Aragon OSx contracts and their internal dependencies.](aragon-osx.svg)

<p class="caption">
  UML diagram of Aragon OSx contracts and their internal dependencies.
</p>

</div>

## Interfaces

- `IDAO`
- `IPlugin`
- `IPluginSetup`
- `IPluginRepo`
- `IPermissionCondition`
- `IProposal`
- `IMembership`

## Abstract Contracts

### Non-Upgradable

- `DaoAuthorizable`
- `Proposal`
- `CallbackHandler`
- `PermissionManager`
- `Plugin`
- `PluginCloneable`
- `PluginSetup`

### Upgradeable

- `DaoAuthorizableUpgradeable`
- `ProposalUpgradeable`
- `InterfaceBasedRegistry`

## Deployed Contracts

### Non-Upgradable

- `DAOFactory`
- `PluginRepoFactory`
- `PluginSetupProcessor`

### Upgradeable

- `DAO`
- `DAORegistry`
- `PluginRepo`
- `PluginRepoRegistry`
- `PluginUUPSUpgradeable`
- `ENSSubdomainRegistrar`
