---
title: Initialization
---

## Initializing Non-upgradeable Plugins

Let's start from the beginning: Initialization. Every plugin receives and stores the address of the DAO it is associated with.
In addition, your plugin implementation might introduce other storage variables that need to be initialized immediately after the contract was created. This is also the case for our `SimpleAdmin` plugin example the admin address.

```solidity
contract SimpleAdmin is Plugin {
  address public admin;
}
```

The way how this is done depends on the deployment method you selected.

### Deployment Through Instantiation via Solidity's `new` Keyword

To instantiate your implementation contract via Solidity's `new` keyword, you inherit from the `Plugin` contract. In this case, the compiler forces you to write a `constructor` calling the `Plugin` parent `constructor` and providing it with a contract of type `IDAO`. Inside the constructor, you might want to initialize the storage variables that you have added yourself, such as the `admin` address in the example below:

<details>
<summary><code>SimpleAdmin</code> Initialization: <code>new</code> Keyword</summary>

```solidity
// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.17;

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

</details>

:::note
We used Solidity's `immutable` keyword so that the admin variable can never be changed. Immutable variables can only be initialized in the constructor.
:::

The `Plugin(_dao)` constructor stores the `IDAO _dao` reference in the right place. If our plugin implementation is deployed often, which we expect, we can [save significant amounts of gas by deployment through the minimal proxy pattern](https://blog.openzeppelin.com/workshop-recap-cheap-contract-deployment-through-clones/).

### Deployment via the Minimal Proxy Pattern

To deploy your implementation contract via the [minimal clones pattern (ERC-1167)](https://eips.ethereum.org/EIPS/eip-1167), you inherit from the `PluginCloneable` contract introducing the same features as `Plugin`. The only difference is that you now have to remember to write an `initialize` function.

<details>
<summary><code>SimpleAdmin</code> Initialization: Minimal Proxy Pattern</summary>

```solidity
// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.17;

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

</details>

We must protect it from being called multiple times by using [OpenZepplin's `initializer` modifier made available through `Initalizable`](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable) and call the internal function `__PluginCloneable_init(IDAO _dao)` available through the `PluginCloneable` base contract to store the `IDAO _dao` reference in the right place.

:::caution
If you forget calling `__PluginCloneable_init(_dao)` inside your `initialize` function, your plugin won't be associated with a DAO and cannot use the DAO's `PermissionManager`.
:::
