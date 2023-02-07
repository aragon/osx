---
title: The DAO Framework
---

## The Infrastructure Behind the AraongOS DAO Framework

The aragonOS DAO Framework provides **infrastructure-related contracts** for the **creation of DAOs** and the **management of the AragonOS plugin repository**.

<div class="center-column">

![](aragon-os-infrastructure-core-overview.drawio.svg)

<p class="caption"> 
  Overview of the aragonOS DAO framework infrastructure and core primitives.
</p>

</div>

### DAO Creation

| Contract      | Description                                                                                         | Relationship    |
| :------------ | :-------------------------------------------------------------------------------------------------- | :-------------- |
| `DAOFactory`  | A global helper to deploy new DAO instances and bootstrap the initial plugins, using our framework. | creates `DAO`   |
| `DAORegistry` | Registers DAOs and assigns an ENS subdomain                                                         | registers `DAO` |

### Plugin Management

#### Setup

| Contract                      | Description                                                                                           | Relationship                                         |
| :---------------------------- | :---------------------------------------------------------------------------------------------------- | :--------------------------------------------------- |
| `IPluginSetup`                |                                                                                                       |                                                      |
| `PluginSetup`                 | A template so that plugin developers can bootstrap plugins and helpers for a DAO using our framework. | `Plugin`, `PluginCloneable`, `PluginUUPSUpgradeable` |
| `PluginSetupProcessor`        |                                                                                                       |                                                      |
| `PluginSetupProcessorHelpers` |                                                                                                       |                                                      |

#### Repository

| Contract             | Description                                                                                          | Relationship           |
| :------------------- | :--------------------------------------------------------------------------------------------------- | :--------------------- |
| `IPluginRepo`        |                                                                                                      |                        |
| `PluginRepo`         | A repository of a plugin's versions. Each version contains the corresponding `PluginSetup` contract. | versions `PluginSetup` |
| `PluginRepoFactory`  | Creates `PluginRepo` contracts                                                                       | creates `PluginRepo`   |
| `PluginRepoRegistry` | Registers `PluginRepo` contracts                                                                     | registers `PluginRepo` |

In the following sections, [The DAO Creation Process](01-dao-creation-process.md) and the [The Aragon Plugin Repository](02-plugin-repository/index.md) are explained in more detail.
