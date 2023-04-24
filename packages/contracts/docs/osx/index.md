---
title: Aragon OSx
sidebar_label: Intro
sidebar_position: 0
---

## The Contracts Behind the Protocol

The Aragon OSx protocol allows you to customize your DAO by managing contract permissions or developing your own plugin. To **add the contracts to your project**, open a terminal in your projects root folder and type

```shell
yarn add @aragon/osx
```

To **import the contracts** into your Solidity project, use

```solidity title="MyCoolPlugin.sol"
// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.17;

import {Plugin, IDAO} from '@aragon/osx/core/plugin/Plugin.sol';

contract MyCoolPlugin is Plugin {
  // ...
}
```

### Overview

- `@aragon/osx/core` includes the core primitives for you to use and build upon. The folders `/plugin` and `/permission` contain the parts you need to build your own plugin.
- `@aragon/osx/framework` includes framework-related contracts running the Aragon OSx protocol infrastructure. The contract `/plugin/setup/PluginSetup.sol` is everything you need to write a plugin setup.
- `@aragon/osx/plugins` includes governance plugins developed by Aragon and shipped with the launch of our new protocol.
- `@aragon/osx/token` includes governance token implementations that can be used inside your plugin.

### Walkthrough

This documentation is divided into conceptual and practical sections as well as the reference guide.

- Conceptual [How It Works articles](01-how-it-works/index.md) explain the architecture behind our protocol.
- Practical [How-to Guides](02-how-to-guides/index.md) teach you how to use and leverage our protocol
- The [Reference Guide](03-reference-guide/index.md) generated from the NatSpec comments of the latest `@aragon/osx` release documents each individual Solididty contract, function, and variable.
