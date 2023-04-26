---
title: How to create Governance Plugins
---

## Developing a Governance Plugin

One of the most common use cases for plugins are governance plugins. Governance plugins are plugins DAOs install to help them make decisions.

### What are Governance Plugins

Governance plugins are characterized by the **ability to execute actions in the DAO** they have been installed to. Accordingly, the `EXECUTE_PERMISSION_ID` is granted on installation on the installing DAO to the governance plugin contract.

```solidity
grant({
    where: installingDao,
    who: governancePlugin,
    permissionId: EXECUTE_PERMISSION_ID
});
```

Beyond this fundamental ability, governance plugins usually interact with two interfaces:

- [The `IProposal` interface](./01-proposals.md) introducing the **notion of proposals** and how they are created and executed.
- [The `IMembership` interface](./02-membership.md) introducing the **notion of membership** to the DAO.

### Examples of Governance Plugins

Some examples of governance plugins are:
- [A token-voting plugin](https://github.com/aragon/osx/tree/develop/packages/contracts/src/plugins/governance/majority-voting/token): Results are based on what the majority votes and the vote's weight is determined by how many tokens an account holds. Ex: Alice has 10 tokens, Bob 2, and Alice votes yes, the yes wins.
- [Multisig plugin](https://github.com/aragon/osx/tree/develop/packages/contracts/src/plugins/governance/multisig): A determined set of addresses is able to vote. Once x amount of addresses vote (as determined by the plugin settings), then the proposal is automatically approved.
- [Admin plugin](https://github.com/aragon/osx/tree/develop/packages/contracts/src/plugins/governance/admin): One address has full control of the DAO.

:::note
More tutorials on how to build governance plugins coming soon.
:::

<!-- Add a graphic -->

<!-- Add a code example -->
