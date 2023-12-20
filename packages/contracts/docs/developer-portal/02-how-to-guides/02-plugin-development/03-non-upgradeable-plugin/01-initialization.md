---
title: Initialization
---

## How to Initialize Non-Upgradeable Plugins

Every plugin should receive and store the address of the DAO it is associated with upon initialization. This is how the plugin will be able to interact with the DAO that has installed it.

In addition, your plugin implementation might want to introduce other storage variables that should be initialized immediately after the contract was created. For example, in the `SimpleAdmin` plugin example (which sets one address as the full admin of the DAO), we'd want to store the `admin` address.

```solidity
contract SimpleAdmin is Plugin {
  address public admin;
}
```

The way we set up the plugin's `initialize()` function depends on the plugin type selected. To review plugin types in depth, check out our [guide here](../02-plugin-types.md).

Additionally, the way we deploy our contracts is directly correlated with how they're initialized. For Non-Upgradeable Plugins, there's two ways in which we can deploy our plugin:

- Deployment via Solidity's `new` keyword, OR
- Deployment via the Minimal Proxy Pattern

### Option A: Deployment via Solidity's `new` Keyword

To instantiate the contract via Solidity's `new` keyword, you should inherit from the `Plugin` Base Template Aragon created. You can find it [here](https://github.com/aragon/osx/blob/develop/packages/contracts/src/core/plugin/Plugin.sol).

In this case, the compiler will force you to write a `constructor` function calling the `Plugin` parent `constructor` and provide it with a contract of type `IDAO`. Inside the constructor, you might want to initialize the storage variables that you have added yourself, such as the `admin` address in the example below.

```solidity
// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.21;

import {Plugin, IDAO} from '@aragon/osx/core/plugin/Plugin.sol';

contract SimpleAdmin is Plugin {
  address public immutable admin;

  /// @notice Initializes the contract.
  /// @param _dao The associated DAO.
  /// @param _admin The address of the admin.
  constructor(IDAO _dao, address _admin) Plugin(_dao) {
    admin = _admin;
  }
}
```

:::note
The `admin` variable is set as `immutable` so that it can never be changed. Immutable variables can only be initialized in the constructor.
:::

This type of constructor implementation stores the `IDAO _dao` reference in the right place. If your plugin is deployed often, which we could expect, we can [save significant amounts of gas by deployment through using the minimal proxy pattern](https://blog.openzeppelin.com/workshop-recap-cheap-contract-deployment-through-clones/).

### Option B: Deployment via the Minimal Proxy Pattern

To deploy our plugin via the [minimal clones pattern (ERC-1167)](https://eips.ethereum.org/EIPS/eip-1167), you inherit from the `PluginCloneable` contract introducing the same features as `Plugin`. The only difference is that you now have to remember to write an `initialize` function.

```solidity
// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.21;

import {PluginCloneable, IDAO} from '@aragon/osx/core/plugin/PluginCloneable.sol';

contract SimpleAdmin is PluginCloneable {
  address public admin;

  /// @notice Initializes the contract.
  /// @param _dao The associated DAO.
  /// @param _admin The address of the admin.
  function initialize(IDAO _dao, address _admin) external initializer {
    __PluginCloneable_init(_dao);
    admin = _admin;
  }
}
```

We must protect it from being called multiple times by using [OpenZepplin's `initializer` modifier made available through `Initalizable`](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable) and call the internal function `__PluginCloneable_init(IDAO _dao)` available through the `PluginCloneable` base contract to store the `IDAO _dao` reference in the right place.

:::caution
If you forget calling `__PluginCloneable_init(_dao)` inside your `initialize` function, your plugin won't be associated with a DAO and cannot use the DAO's `PermissionManager`.
:::
