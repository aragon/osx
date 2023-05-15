---
title: Get Started with Developing your Plugin
---

# Quickstart

Aragon OSx makes it easy for you to write, maintain, and distribute your own plugin. Here's how.

## Hello, World!

### Setup

First, let's [create a Hardhat project](https://hardhat.org/tutorial/creating-a-new-hardhat-project).

```bash
mkdir aragon-plugin-tutorial
cd aragon-plugin-tutorial
yarn init
yarn add --dev hardhat
npx hardhat
```

You'll want to select an empty Hardhat project to get started.

```
$ npx hardhat
888    888                      888 888               888
888    888                      888 888               888
888    888                      888 888               888
8888888888  8888b.  888d888 .d88888 88888b.   8888b.  888888
888    888     "88b 888P"  d88" 888 888 "88b     "88b 888
888    888 .d888888 888    888  888 888  888 .d888888 888
888    888 888  888 888    Y88b 888 888  888 888  888 Y88b.
888    888 "Y888888 888     "Y88888 888  888 "Y888888  "Y888

👷 Welcome to Hardhat v2.9.9 👷‍

? What do you want to do? …
  Create a JavaScript project
  Create a TypeScript project
❯ Create an empty hardhat.config.js
  Quit
```

Then, you'll want to import the Aragon OSx contracts inside your Solidity project.

```bash
yarn add @aragon/osx
```
or
```bash
npm install @aragon/osx
```

Now that we have OSx within our project, we can start developing our plugin implementation.

### GreeterPlugin

We'll create a Greeter Plugin which returns a "Hello World!" string when calling on `greet()`.

In order to do this, we'll create a `GreeterPlugin.sol` file. This is where all  of our plugin logic will live.

```bash
mkdir contracts && cd contracts
touch GreeterPlugin.sol
```

Inside the `GreeterPlugin.sol`, we want to:
- Pass the DAO the plugin will be using within the constructor. This will enable us to install a Plugin into a DAO.
- Add the greeter function.

```solidity
// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.17;

import {Plugin, IDAO} from '@aragon/osx/core/plugin/Plugin.sol';

contract GreeterPlugin is Plugin {
  constructor(IDAO _dao) Plugin(_dao) {}

  function greet() external pure returns (string memory) {
    return 'Hello world!';
  }
}
```

### GreeterSetup

Once we're done with the plugin logic, we want to write a Setup contract.

The Setup contract contains the instructions to be called whenever this plugin is installed, uninstalled or upgraded for a DAO. It is the one in charge of setting the permissions that enable the plugin execute actions on the DAO.

Let's create our GreeterSetup contract inside your `contracts` folder:

```bash
touch GreeterSetup.sol
```

Inside the file, we'll add the `prepareInstallation` and `prepareUninstallation` functions. These are the functions that will get called to install/uninstall the plugin into a DAO.

```solidity
// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.17;

import {PermissionLib} from '@aragon/osx/core/permission/PermissionLib.sol';
import {PluginSetup} from '@aragon/osx/framework/plugin/setup/PluginSetup.sol';
import './GreeterPlugin.sol';

contract GreeterSetup is PluginSetup {
  function prepareInstallation(
    address _dao,
    bytes memory
  ) external returns (address plugin, PreparedSetupData memory /*preparedSetupData*/) {
    plugin = address(new GreeterPlugin(IDAO(_dao)));
  }

  function prepareUninstallation(
    address _dao,
    SetupPayload calldata _payload
  ) external pure returns (PermissionLib.MultiTargetPermission[] memory /*permissions*/) {
    (_dao, _payload);
  }

  function implementation() external view returns (address) {}
}
```

### Deploy the Plugin

To publish the plugin into the Aragon protocol, we first need to deploy the `PluginSetup.sol` contract to our network of choice. We can deploy it using [Hardhat's deploy script](https://hardhat.org/tutorial/deploying-to-a-live-network).

In order to deploy directly from Hardhat, we'll use [Hardhat's Toolbox](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-toolbox).

```bash
yarn add @nomicfoundation/hardhat-toolbox
```

Then, we can create a folder called `scripts` and inside of it, we'll add our deploy script.

```bash
mkdir scripts && touch scripts/deploy.cjs
```

Inside that file, we will add our deploy script.

```js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const getGreeterSetup = await hre.ethers.getContractFactory("GreeterSetup");
  const GreeterSetup = await getGreeterSetup.deploy();

  console.log("GreeterSetup address:", GreeterSetup.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
```

On the terminal, we should then see something like this:
```bash
Deploying contracts with the account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Account balance: 10000000000000000000000
GreeterSetup address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### Publish the Plugin to the Aragon protocol

<!-- TODO: Provide the steps for devs to do this. Should it be done directly from Etherscan as of now? -->
Lastly, we can call the [`createPluginRepoWithFirstVersion` function from Aragon's `PluginRepoFactory`](../../03-reference-guide/framework/plugin/repo/PluginRepoFactory.md) passing it the address of your deployed `GreeterSetup` contract and the first version of your Plugin will be published into the protocol!

We can do this directly off of calling the function on Etherscan ([make sure to get the right scan and contract address based on your network](https://github.com/aragon/osx/blob/develop/active_contracts.json)) or through locally calling on the method from your project using Ethers.

<!-- TODO: Add image of Etherscan instructions -->

### Next Steps

Congratulations 🎉! You've developed a plugin that every Aragon DAO will be able to use.

Currently, it is not doing much. Let's change this by adding additional functionality. You check out our [existing plugins](https://github.com/aragon/osx/tree/develop/packages/contracts/src/plugins) as inspiration.

You could also make it:

- [a non-upgradeable governance plugin](./03-non-upgradeable-plugin/index.md)
- [an upgradeable plugin (advanced)](./04-upgradeable-plugin/index.md)

But first, let's have a look at:

- [best practices and patterns](./01-best-practices.md)
- [different plugin deployment types](./02-plugin-types.md)

And if you want to add additional versions to it, check out our guides on:
- [How to publish a plugin](./07-publication/01-publication-process.md)
- [How to manage plugin versioning](./07-publication/02-versioning.md)
