---
title: Manage your DAO's Plugins
---

## How to manage the Plugins within your DAO

<!-- TODO This page needs improvements -->

You can install, uninstall or update any plugin into your DAO. If you want to dive deeper into plugins, check out [how plugins work here](../../../01-how-it-works/01-core/03-plugins/index.md).

Before diving deeper into this guide, make sure that you understand [permissions](../../../01-how-it-works/01-core/02-permissions/index.md) and know about the [DAO executor](../../../01-how-it-works/01-core/01-dao/index.md).

#### How to create a DAO with Plugins

When you create your DAO, you must **install at least one functioning governance plugin** (meaning one plugin having the `EXECUTION_PERMISSION`) so your have a mechanism of executing actions on behalf of your DAO.
This is crucial because otherwise nobody can operate the DAO and it would become incapacitated right after it was created. You would have spent gas for nothing.

:::info
If you create your DAO through the [Aragon App](https://app.aragon.org) or the [Aragon SDK](https://devs.aragon.org/docs/sdk), this will be checked and you will be warned in case you have not selected a suitable Aragon plugin.
:::

Although the easiest (and recommended) way to create your DAO is through the [Aragon App](https://app.aragon.org) or the [Aragon SDK](https://devs.aragon.org/docs/sdk), you can also do it directly from the protocol through calling on the [`createDAO` function](https://github.com/aragon/osx/blob/develop/packages/contracts/src/framework/dao/DAOFactory.sol#L63) from the `DAOFactory` contract and passing it the calldata `DAOSettings` for your DAO as well as the `PluginSettings` array referencing the plugins and the settings to be installed upon DAO creation.

<!-- TODO: Let's add a code example here on how the call to this function would look -->

#### How to change a DAO's Governance Setup after a DAO has been created

After a DAO is created with at least one plugin installed with `EXECUTE_PERMISSION` on the DAO, it's likely you may want to change change your governance setup later on by [installing, updating, or uninstalling plugins](../../../01-how-it-works/02-framework/02-plugin-management/02-plugin-setup/index.md).

Here, it is very important that you **maintain at least one functioning governance plugin** (a contract with `EXECUTE_PERMISSION` on the DAO) so that your assets are not locked in the future. In that regard, you want to be careful to not accidentally:

- uninstall every plugin within your DAO, or
- update or upgrade the plugin or otherwise change the internal plugin settings.

If you do that, nobody would be able to create proposals and execute actions on the DAO anymore. Accordingly, DAOs must review proposals requesting to change the governance setup with utmost care before voting for them. In the next section, we explain how to review a proposal properly and what to pay attention too.

<!-- Make a separate section about the DAO executor -->

### How to maintain Execution Permission on the DAO

A very important thing to consider when operating your DAO is to make sure that you do not lock it - meaning, you allow it into a state where the DAO cannot execute actions anymore.

The accidental loss of the permission to execute actions on your DAO ([the `EXECUTION_PERMISSION_ID` permission](../../../01-how-it-works/01-core/02-permissions/index.md#permissions-native-to-the-dao-contract)) incapacitates your DAO. If this happens, you are not able to withdraw funds or act through the DAO, unless you have the `ROOT_PERMISSION_ID` on the DAO.

:::danger
Do not interact directly with the smart contracts unless you know exactly what you are doing, **especially if this involves granting or revoking permissions**. Instead, use the Aragon App or Aragon SDK for creating and managing your DAO and interacting with the smart contracts.
:::

If you interact with the Aragon OSx protocol through the Aragon App frontend or the Aragon SDK and use only audited and verified plugins, this will not happen.
However, diligence and care is required in some situations.
