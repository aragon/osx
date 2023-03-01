---
title: Best Practices
---

## Advices for the Developing a Plugin

Before

### DOs 👌

- Document your contracts using [NatSpec](https://docs.soliditylang.org/en/v0.8.17/natspec-format.html).
- Test your contracts, e.g., using toolkits such as [hardhat (JS)](https://hardhat.org/hardhat-runner/docs/guides/test-contracts) or [Foundry (Rust)](https://book.getfoundry.sh/forge/tests).
- Use the `auth` modifier to control the access to functions in your plugin instead of `onlyOwner` or similar.
- Write plugins implementations that need minimal permissions on the DAO.
- Write `PluginSetup` contracts that remove all permissions on uninstallation that they requested during installation or updates.
- Plan the lifecycle of your plugin (need for upgrades).
- Follow our [versioning guidelines](../02-plugin-development/07-publication/02-versioning.md).

### DON'Ts ✋

- Leave any contract uninitialized
- Grant the `ROOT_PERMISSION_ID` permission to anything or anyone.
- Grant with `who: ANY_ADDR` unless you know what you are doing.
- Expect people to grant or revoke any permissions manually during the lifecycle of a plugin. The `PluginSetup` should take this complexity away from the user and after uninstallation, all permissions should be removed.
- Write upgradeable contracts that
  - Repurpose existing storage (in upgradeable plugins)
  - Inherit from previous versions as this can mess up the inheritance chain. Instead, write self-contained contracts.

<!-- - A plugin requesting the exact same permission to another one + uninstalling it -->
<!-- - Publishing plugin versions that provide no guarantees (setup contracts upgradeable behind the scenes by the dev)-->

In the following sections, you will learn about the details.
