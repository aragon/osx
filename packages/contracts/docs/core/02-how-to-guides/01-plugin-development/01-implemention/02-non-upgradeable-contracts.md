---
title: Non-upgradeable Plugins
---

## Developing the Implementation Contract for Non-upgradeable Plugins

:::note
Work in progress
:::

### Prerequisites

You have read about the different [plugin types](01-plugin-types.md) and decided to develop a non-upgradeable plugin being deployed via

- the `new` keyword or
- the [minimal clones pattern (ERC-1167)](https://eips.ethereum.org/EIPS/eip-1167)

### Initialization

Let's start from the beginning. Your plugin might introduce storage variables that need to be initialized immediately after the contract was created.
The way how this is done depends on the deployment method you selected.

#### Instantiation via Solidity's `new` Keyword

To instantiate your implementation contract via Solidity's `new` keyword, you inherit from the `Plugin` contract.
In this case, the compiler forces you to write a `constructor` calling the `Plugin` parent `constructor` and providing it with a contract of type `IDAO`

```solidity
constructor(
  IDAO _dao,
  // ... your initialization-related arguments
  ) Plugin(_dao) {
  // ... your initialization-related logic
}

```

The constructor in `Plugin` calls another parent class

```solidity title="contracts/contracts/core/plugin/Plugin.sol"
constructor(IDAO _dao) DaoAuthorizable(_dao) {}

```

This sets the `DAO` in the plugin's storage.

:::info
This passing-on of arguments to parent classes is called constructor-chaining.
:::

#### Deployment via the Minimal Clones Pattern

To deploy your implementation contract via the [minimal clones pattern (ERC-1167)](https://eips.ethereum.org/EIPS/eip-1167), you inherit from the `PluginCloneable` contract.
In this case, you have to remember to write an `initialize` function

```solidity title="YourCloneablePlugin.sol"
function initialize(
      IDAO _dao,
      // ... your initialization-related arguments
  ) external initializer {
      __PluginCloneable_init(_dao);
      // ... your initialization-related logic
  }

```

You protect it from being used multiple times by using [OpenZepplin's `initializer` modifier made available through `Initalizable`](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable) and call the internal function

```solidity title="contracts/contracts/core/plugin/PluginCloneable.sol"
function __PluginCloneable_init(IDAO _dao) internal virtual onlyInitializing {
  __DaoAuthorizableCloneable_init(_dao);
}

```

This function comes from the `PluginCloneable` base contract and takes care of storing the associated DAO in the plugin's storage.

:::caution
If you forget calling `__PluginCloneable_init(_dao)`, your plugin won't be associated with a DAO and cannot use the DAO's `PermissionManager`.
:::

### Implementing the logic

Now, that the plugin is initalized, we can focus on writing the actual plugin logic.

:::note
To do:

- write about general best practices for functions (visibility)
- explain how to use `auth()` for functions

:::

Now that your non-upgradeable plugin implementation is finished, you can continue with
[Developing the Setup Contract for Non-upgradeable Plugins](../02-setup/01-non-upgradeable-plugins.md).
