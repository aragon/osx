---
title: What are Upgradeable Plugins?
---

## How to develop an Upgradeable Plugin

Upgradeable contracts offer advantages because you can cheaply change or fix the logic of your contract without losing the storage of your contract. If you want to review plugin types in depth, check out our [guide on plugin types here](../02-plugin-types.md).

The drawbacks however, are that:

- there are plenty of ways to make a mistake, and
- the changeable logic poses a new attack surface.

Although we've abstracted away most of the complications of the upgrade process through our `PluginUUPSUpgradeable` base class, please know that writing an upgradeable contract is an advanced topic.

### Prerequisites

- You have read about the different [plugin types](../02-plugin-types.md) and decided to develop an upgradeable plugin being deployed via the [UUPS pattern (ERC-1822)](https://eips.ethereum.org/EIPS/eip-1822).
- You know how to write a [non-upgradeable plugin](../03-non-upgradeable-plugin/index.md).
- You know about the difficulties and pitfalls of ["Writing Upgradeable Contracts"](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable) that come with
  - modifiying the storage layout
  - initialization
  - inheritance
  - leaving storage gaps

Up next, check out our guides on:

1. [How to initialize an Upgradeable Plugins](./01-initialization.md)
2. [How to build the implementation of an Upgradeable Plugin](./02-implementation.md)
3. [How to build and deploy a Plugin Setup contract for an Upgradeable Plugin](./03-setup.md)
4. [How to create a subsequent build implementation to an Upgradeable Plugin](./04-subsequent-builds.md)
5. [How to upgrade an Upgradeable Plugin](./05-updating-versions.md)
6. [How to publish my plugin into the Aragon OSx protocol](../07-publication/index.md)
