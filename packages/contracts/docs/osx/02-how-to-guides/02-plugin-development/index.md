---
title: Plugin Development
---

## Quickstart

Aragon OSx makes it easy for you to write, maintain, and distribute your own plugin. Here, we show you how.

### Hello, World!

To use the Aragon OSx contracts inside your project, import them with `yarn add @aragon/core-contracts` and start developing your own plugin implementation:

<!-- TODO: rename @aragon/core-contracts to @aragon/os-contracts and make sure .sol files are part of the NPM package-->

```solidity
// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.17;

import {Plugin, IDAO} from '@aragon/osx/core/plugin/Plugin.sol';

contract MyPlugin is Plugin {
  constructor(IDAO _dao) Plugin(_dao) {}

  function greet() external pure returns (string memory) {
    return 'Hello, world!';
  }
}
```

Next, you write a plugin setup contract

```solidity
// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.17;

import {PermissionLib} from '@aragon/osx/core/permissions/PermissionsLib.sol';
import {PluginSetup} from '@aragon/osx/framework/plugin/setup/PluginSetup.sol';
import './MyPlugin.sol';

contract MyPluginSetup is PluginSetup {
  /// @inheritdoc IPluginSetup
  function prepareInstallation(
    address _dao,
    bytes memory
  ) external returns (address plugin, PreparedSetupData memory /*preparedSetupData*/) {
    plugin = address(new MyPlugin(IDAO(_dao)));
  }

  /// @inheritdoc IPluginSetup
  function prepareUninstallation(
    address _dao,
    SetupPayload calldata _payload
  ) external pure returns (PermissionLib.MultiTargetPermission[] memory /*permissions*/) {
    (_dao, _payload);
  }

  /// @inheritdoc IPluginSetup
  function getImplementationAddress() external view returns (address) {}
}
```

... and that's it 🎉.

### Next Steps

You've developed a minimal plugin that can be published on the Aragon plugin registry to be installed and uninstalled to your DAO. Currently, it is not doing much. Let's change this by writing

- [an non-upgradeable governance plugin](./03-non-upgradeable-plugin/index.md)
- [an upgradeable plugin (advanced)](./04-upgradeable-plugin/index.md)

But first, let's have a look at

- [best practices and patterns](./01-best-practices.md)
- [different plugin deployment types](./02-plugin-types.md)

to follow when developing a plugin, and finally, how to [publish](./07-publication/01-publication-process.md) and [version](./07-publication/02-versioning.md) it.
