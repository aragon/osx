---
title: Publication of your Plugin into Aragon OSx
---

## How to publish a plugin into Aragon's plugin registry

Once you've deployed your Plugin Setup contract, you will be able to publish your plugin into Aragon's plugin registry so any Aragon DAO can install it.

### 1. Make sure your plugin is deployed in the right network

Make sure your Plugin Setup contract is deployed in your network of choice (you can find all of the networks we support [here](https://github.com/aragon/osx-commons/tree/develop/configs/src/deployments/json)). You will need the address of your Plugin Setup contract to be able to publish the plugin into the protocol.

### 2. Publishing your plugin

Every plugin in Aragon can have future versions, so when publishing a plugin to the Aragon protocol, we're really creating a [`PluginRepo`](https://github.com/aragon/osx/blob/develop/packages/contracts/src/framework/plugin/repo/PluginRepo.sol) instance for each plugin, which will contain all of the plugin's versions.

To publish a plugin, we will use Aragon's `PluginRepoFactory` contract - in charge of creating `PluginRepo` instances containing your plugin's versions. To do this, we will call its `createPluginRepoWithFirstVersion` function, which will [create the first version of a plugin](https://github.com/aragon/core/blob/develop/packages/contracts/src/framework/plugin/repo/PluginRepoFactory.sol#L48) and add that new `PluginRepo` address into the `PluginRepoRegistry` containing all available plugins within the protocol.

You can find all of the addresses of `PluginRepoFactory` contracts by network [here](https://github.com/aragon/osx-commons/tree/develop/configs/src/deployments/json).

To create more versions of your plugin in the future, you'll call on the [`createVersion` function](https://github.com/aragon/osx/blob/develop/packages/contracts/src/framework/plugin/repo/PluginRepo.sol#L128) from the `PluginRepo` instance of your plugin. When you publish your plugin, you'll be able to find the address of your plugin's `PluginRepo` instance within the transaction data.

To deploy your plugin, follow the steps in the [`osx-plugin-template-hardhat` README.md](https://github.com/aragon/osx-plugin-template-hardhat/blob/main/README.md#deployment).
