---
title: How to build Non-Upgradeable Plugins
---

## How to build Non-Upgradeable Plugin

In this section, we guide you through the implementation of building a Non-Upgradeable Plugin.

A Non-Upgradeable Plugin is a Plugin built on smart contracts that cannot be upgraded. This may or may not be what you want.

Some observations:

- Simpler to create, deploy, and manage.
- Instantiation is done via the `new` keyword or deployed via the [minimal proxy pattern (ERC-1167)](https://eips.ethereum.org/EIPS/eip-1167)
- The storage is contained within versions. So if your plugin is dependent on state information from previous versions, you won't have access to it directly in upcoming versions, since every version is a blank new slate. If this is a requirement for your project, we recommend you deploy an [Upgradeable Plugin](../04-upgradeable-plugin/index.md).

Before moving on with the Guides, make sure you've read our documentation on [Choosing the Best Type for Your Plugin](../02-plugin-types.md) to make sure you're selecting the right type of contract for your Plugin.

Up next, check out our guides on:

1. [How to initialize Non-Upgradeable Plugins](./01-initialization.md)
2. [How to build the implementation of a Non-Upgradeable Plugin](./02-implementation.md)
3. [How to build and deploy a Plugin Setup contract for a Non-Upgradeable Plugin](./03-setup.md)
4. [How to publish my plugin into the Aragon OSx protocol](../07-publication/index.md)
