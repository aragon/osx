---
title: Managing Plugins
---

## Managing The Plugins Attached to Your DAO

<!-- TODO This page needs improvements -->

In this guide, you'll learn how to manage the plugins you install, update, and uninstall to your DAO.
Make sure that you understand [permissions](../../../01-how-it-works/01-core/02-permissions/index.md) and know about the [DAO executor](../../../01-how-it-works/01-core/01-dao/index.md).

<!-- Make a separate section about the DAO executor -->

### Maintaining Execution Permission On The DAO

A very important thing to consider when operating your DAO is to make sure that you do not bring it into state where you cannot execute actions anymore.

The accidental loss of the permission to execute actions on your DAO, [the `EXECUTION_PERMISSION_ID`] permission](../../../01-how-it-works/01-core/02-permissions/index.md#permissions-native-to-the-dao-contract) this incapacitates your DAO. If this happens, you are not able to withdraw funds or act through the DAO, unless you have the `ROOT_PERMISSION_ID` on the DAO.

:::danger
Do not interact directly with the smart contracts unless you know exactly what you are doing, **especially if this involves granting or revoking permissions**. Instead, use the Aragon App or Aragon SDK for creating and managing your DAO and interacting with the smart contracts.
:::

If you interact with the Aragon OSx protocol through the Aragon App frontend or the Aragon SDK and use only audited and verified plugins, this will not happen.
However, diligence and care is required in some situations.

#### DAO Creation

When you create your DAO, you must **install at least one functioning governance plugin** (meaning a plugin having `EXECUTION_PERMISSION_ID` permission) to your DAO allowing it to execute actions.
This is crucial because otherwise nobody can operate the DAO and it would become incapacitated right after it was created. You would have spent gas for nothing.

:::info
If you create your DAO through the Aragon App frontend or Aragon SDK, this will be checked and you will be warned in case you have not selected a suitable Aragon plugin.
:::

#### Change of Your Governance Setup

After you created your DAO and made sure that at least one address has the permission to execute on the DAO, you might want to change change your governance setup by [installing, updating, or uninstalling plugins](../../../01-how-it-works/02-framework/02-plugin-management/02-plugin-setup/index.md).

Here, it is very important that you **maintain at least one functioning governance plugin** attached to your DAO. Be careful to not accidentally

- uninstall the last one
- update or upgrade the plugin or otherwise change the internal plugin settings

so that they cannot create proposals and execute actions on the DAO anymore. Accordingly, DAOs must review proposals requesting to change the governance setup with utmost care before voting for them. In the next section, we explain how to review a proposal properly and what to pay attention too.
