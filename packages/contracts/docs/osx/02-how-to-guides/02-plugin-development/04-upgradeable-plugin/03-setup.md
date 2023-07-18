---
title: The Plugin Setup Contract
---

## How to build the Plugin Setup Contract for Upgradeable Plugins

The Plugin Setup contract is the contract defining the instructions for installing, uninstalling, or upgrading plugins into DAOs. This contract prepares the permission granting or revoking that needs to happen in order for plugins to be able to perform actions on behalf of the DAO.

### 1. Finish the Plugin contract's first build

Before building the Plugin Setup contract, make sure you have the logic for your plugin implemented. In this case, we're building a simple storage pugin which stores a number.

```solidity
// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.17;

import {IDAO, PluginUUPSUpgradeable} from '@aragon/osx/core/plugin/PluginUUPSUpgradeable.sol';

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

### 2. Add the `prepareInstallation()` and `prepareUninstallation()` functions

Each `PluginSetup` contract is deployed only once and each plugin version will have its own `PluginSetup` contract deployed. Accordingly, we instantiate the `implementation` contract via Solidity's `new` keyword as deployment with the minimal proxy pattern would be more expensive in this case.

In order for the Plugin to be easily installed into the DAO, we need to define the instructions for the plugin to work effectively. We have to tell the DAO's Permission Manager which permissions it needs to grant or revoke.

Hence, we will create a `prepareInstallation()` function, as well as a `prepareUninstallation()` function. These are the functions the `PluginSetupProcessor.sol` (the contract in charge of installing plugins into the DAO) will use.

The `prepareInstallation()` function takes in two parameters:

1. the `DAO` it should prepare the installation for, and
2. the `_data` parameter containing all the information needed for this function to work properly, encoded as a `bytes memory`. In this case, we get the number we want to store.

Hence, the first thing we should do when working on the `prepareInsallation()` function is decode the information from the `_data` parameter.
Similarly, the `prepareUninstallation()` function takes in a `payload`.

```solidity
// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {PermissionLib} from '@aragon/osx/core/permission/PermissionLib.sol';
import {PluginSetup, IPluginSetup} from '@aragon/osx/framework/plugin/setup/PluginSetup.sol';
import {SimpleStorageBuild1} from './SimpleStorageBuild1.sol';

/// @title SimpleStorageSetup build 1
contract SimpleStorageBuild1Setup is PluginSetup {
  address private immutable simpleStorageImplementation;

  constructor() {
    simpleStorageImplementation = address(new SimpleStorageBuild1());
  }

  /// @inheritdoc IPluginSetup
  function prepareInstallation(
    address _dao,
    bytes memory _data
  ) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
    uint256 number = abi.decode(_data, (uint256));

    plugin = createERC1967Proxy(
      simpleStorageImplementation,
      abi.encodeWithSelector(SimpleStorageBuild1.initializeBuild1.selector, _dao, number)
    );

    PermissionLib.MultiTargetPermission[]
      memory permissions = new PermissionLib.MultiTargetPermission[](1);

    permissions[0] = PermissionLib.MultiTargetPermission({
      operation: PermissionLib.Operation.Grant,
      where: plugin,
      who: _dao,
      condition: PermissionLib.NO_CONDITION,
      permissionId: SimpleStorageBuild1(this.implementation()).STORE_PERMISSION_ID()
    });

    preparedSetupData.permissions = permissions;
  }

  /// @inheritdoc IPluginSetup
  function prepareUninstallation(
    address _dao,
    SetupPayload calldata _payload
  ) external view returns (PermissionLib.MultiTargetPermission[] memory permissions) {
    permissions = new PermissionLib.MultiTargetPermission[](1);

    permissions[0] = PermissionLib.MultiTargetPermission({
      operation: PermissionLib.Operation.Revoke,
      where: _payload.plugin,
      who: _dao,
      condition: PermissionLib.NO_CONDITION,
      permissionId: SimpleStorageBuild1(this.implementation()).STORE_PERMISSION_ID()
    });
  }

  /// @inheritdoc IPluginSetup
  function implementation() external view returns (address) {
    return simpleStorageImplementation;
  }
}
```

As you can see, we have a constructor storing the implementation contract instantiated via the `new` method in the private immutable variable `implementation` to save gas and an `implementation` function to return it.

:::note
Specifically important for this type of plugin is the `prepareUpdate()` function. Since we don't know the parameters we will require when updating the plugin to the next version, we can't add the `prepareUpdate()` function just yet. However, keep in mind that we will need to deploy new Plugin Setup contracts in subsequent builds to add in the `prepareUpdate()` function with each build requirements. We see this in depth in the ["How to update an Upgradeable Plugin" section](./05-updating-versions.md).
:::

### 3. Deployment

Once you're done with your Plugin Setup contract, we'll need to deploy it so we can publish it into the Aragon OSx protocol. You can deploy your contract with a basic deployment script.

Firstly, we'll make sure our preferred network is well setup within our `hardhat.config.js` file, which should look something like:

```js
import '@nomicfoundation/hardhat-toolbox';

// To find your Alchemy key, go to https://dashboard.alchemy.com/. Infure or any other provider would work here as well.
const goerliAlchemyKey = 'add-your-own-alchemy-key';
// To find a private key, go to your wallet of choice and export a private key. Remember this must be kept secret at all times.
const privateKeyGoerli = 'add-your-account-private-key';

module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${goerliAlchemyKey}`,
      accounts: [privateKeyGoerli],
    },
  },
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  mocha: {
    timeout: 40000,
  },
};
```

Then, create a `scripts/deploy.js` file and add a simple deploy script. We'll only be deploying the PluginSetup contract, since this should deploy the Plugin contract within its constructor.

```js
import {ethers} from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);
  console.log('Account balance:', (await deployer.getBalance()).toString());

  const getSimpleStorageSetup = await ethers.getContractFactory('SimpleStorageSetup');
  const SimpleStorageSetup = await SimpleStorageSetup.deploy();

  await SimpleStorageSetup.deployed();

  console.log('SimpleStorageSetup address:', SimpleStorageSetup.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
```

Finally, run this in your terminal to execute the command:

```bash
npx hardhat run scripts/deploy.ts
```

### 4. Publishing the Plugin to the Aragon OSx Protocol

Once done, our plugin is ready to be published on the Aragon plugin registry. With the address of the `SimpleAdminSetup` contract deployed, we're almost ready for creating our `PluginRepo`, the plugin's repository where all plugin versions will live. Check out our how to guides on [publishing your plugin here](../07-publication/index.md).
