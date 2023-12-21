---
title: Plugin Implementation Contract
---

## How to build an Upgradeable Plugin implementation contract

In this guide, we'll build a `SimpleStorage` Upgradeable plugin which all it does is storing a number.

The Plugin contract is the one containing all the logic we'd like to implement on the DAO.

### 1. Set up the initialize function

Make sure you have the initializer of your plugin well set up. Please review [our guide on how to do that here](./01-initialization.md) if you haven't already.

Once you this is done, let's dive into several implementations and builds, as can be expected for Upgradeable plugins.

### 2. Adding your plugin implementation logic

In our first build, we want to add an authorized `storeNumber` function to the contract - allowing a caller holding the `STORE_PERMISSION_ID` permission to change the stored value similar to what we did for [the non-upgradeable `SimpleAdmin` Plugin](../03-non-upgradeable-plugin/02-implementation.md):

```solidity
import {PluginUUPSUpgradeable, IDAO} '@aragon/osx/core/plugin/PluginUUPSUpgradeable.sol';

/// @title SimpleStorage build 1
contract SimpleStorageBuild1 is PluginUUPSUpgradeable {
  bytes32 public constant STORE_PERMISSION_ID = keccak256('STORE_PERMISSION');

  uint256 public number; // added in build 1

  /// @notice Initializes the plugin when build 1 is installed.
  function initializeBuild1(IDAO _dao, uint256 _number) external initializer {
    __PluginUUPSUpgradeable_init(_dao);
    number = _number;
  }

  function storeNumber(uint256 _number) external auth(STORE_PERMISSION_ID) {
    number = _number;
  }
}
```

### 3. Plugin done, PluginSetup contract next!

Now that we have the logic for the plugin implemented, we'll need to define how this plugin should be installed/uninstalled from a DAO. In the next step, we'll write the `PluginSetup` contract - the one containing the installation, uninstallation, and upgrading instructions for the plugin.
