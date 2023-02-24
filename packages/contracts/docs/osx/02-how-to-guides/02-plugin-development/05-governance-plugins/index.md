---
title: Governance Plugins
---

## Developing a Governance Plugin

Here you'll learn about governance plugins and how to develop your own one.

:::note
This page is a stub and more sections will be added in the future.
:::

### What are Governance Plugins

Governance plugins are characterized by the **ability to execute actions in the DAO** they have been installed to. Accordingly, the `EXECUTE_PERMISSION_ID` is granted on installation on the installing DAO to the governance plugin contract

```solidity
grant({
    where: installingDao,
    who: governancePlugin,
    permissionId: EXECUTE_PERMISSION_ID
});
```

Beyond this fundamental ability, governance plugins fulfill two interfaces:

- [The `IProposal` interface](./01-proposals.md) introducing the **notion of proposals** and how they are created and executed
- [The `IMembership` interface](./02-membership.md) introducing the **notion of membership** to the DAO

This is explained in the upcoming sections.

<!-- Add a graphic -->

<!-- Add a code example -->
