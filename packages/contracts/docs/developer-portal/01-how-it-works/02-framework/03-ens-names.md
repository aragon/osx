---
title: ENS Names
---

## Unique DAO and Plugin Repo Names

To make DAOs and plugin repositories easily identifiable in the Aragon OSx ecosystem, we assign unique ENS names to them upon registration during the [DAO creation](./01-dao-creation/index.md) and [plugin publishing](./02-plugin-management/01-plugin-repo/01-plugin-repo-creation.md) processes.

:::info
You can skip registering an ENS name for your DAO under the `dao.eth` by leaving the [`DAOSettings.subdomain` field](../../03-reference-guide/framework/dao/DAOFactory.md#public-struct-daosettings) empty when calling the [`createDao`](../../03-reference-guide/framework/dao/DAOFactory.md#external-function-createdao) function.
:::

### Allowed Character Set

We allow the following characters for the subdomain names:

- Lowercase letters `a-z`
- Digits `0-9`
- The hyphen `-`

This way, you can name and share the DAO or plugin repo you have created as `my-cool.dao.eth` or `my-handy.plugin.dao.eth` to make their addresses easily shareable and discoverable on ENS-supporting chains.
