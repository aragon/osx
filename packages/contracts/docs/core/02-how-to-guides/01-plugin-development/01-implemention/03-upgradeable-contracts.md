---
title: Upgradeable Plugins
---

## Developing the Implementation Contract for Upgradeable Plugins

:::note
Work in progress
:::'

### Prerequisites

You have read about the different [plugin types](01-plugin-types.md) and decided to develop an upgradeable plugin being deployed via the [UUPS pattern (ERC-1822)](https://eips.ethereum.org/EIPS/eip-1822).

Writing an upgradeable smart contract is an advanced topic. A good place to learn about the pitfalls is [OpenZepplin's guide on "Writing Upgradeable Contracts"](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable).

### Initialization

#### The Initial Plugin Version

To deploy your implementation contract via the [UUPS pattern (ERC-1822)](https://eips.ethereum.org/EIPS/eip-1822), you inherit from the `PluginUUPSUpgradeable` contract.
In analogy to the implementation of [`PluginClonable`](./02-non-upgradeable-contracts.md#deployment-via-the-minimal-clones-pattern), you have to remember to write an `initialize` function

```solidity title="YourUUPSUpgradeablePluginV1.sol"
function initialize(
      IDAO _dao,
      // ... your initialization-related arguments
  ) external initializer {
      __PluginUUPSUpgradeable_init(_dao);
      // ... your initialization-related logic
  }

```

You protect it from being used multiple times by using [OpenZepplin's `initializer` modifier made available through `Initalizable`](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable) and call the internal function

```solidity title="contracts/contracts/core/plugin/PluginCloneable.sol"
function __PluginCloneable_init(IDAO _dao) internal virtual onlyInitializing {
  __DaoAuthorizableCloneable_init(_dao);
}
```

This becomes more demanding for future versions.

#### Subsequent Versions

:::note
To Do
:::

- explain usage of `reinitializer(uint8 version)`

```solidity title="YourUUPSUpgradeablePluginV2.sol"
function initialize(
      IDAO _dao,
      // ... your initialization-related arguments
  ) external reinitializer(2) { // <--- important
      __PluginUUPSUpgradeable_init(_dao);
      // ... your initialization-related logic
  }

```
