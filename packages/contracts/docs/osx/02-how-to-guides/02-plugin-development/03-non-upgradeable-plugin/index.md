---
title: Non-Upgradeable Plugins
---

## Developing a Non-Upgradeable Plugin

In this section, we guide you through the implementation of your own plugin. Here, we use the `SimpleAdmin` plugin as an example, which we intend to work as follows:

The plugin allows one address, the admin address, to send actions to the DAO's executor. The admin address is set only once and can never be changed.
An only slightly more advanced variant is provided by Aragon in the Aragon plugin registry.

### Prerequisites

You have read about the different [plugin types](../02-plugin-types.md) and decided to develop a non-upgradeable plugin with one of the two supported deployment methods:

- instantiation via the `new` keyword
- deployment via the [minimal proxy pattern (ERC-1167)](https://eips.ethereum.org/EIPS/eip-1167)
