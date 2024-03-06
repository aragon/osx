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

Having that said, there's a few ways to publish your plugin into Aragon's protocol:

#### Option A: Etherscan

Go directly to Etherscan and search for the address of the `PluginRepoFactory` as found in [this list](https://github.com/aragon/osx-commons/tree/develop/configs/src/deployments/json).

Then, go to the "Write Contract" tab and add the attributes requested to call on the `createPluginRepoWithFirstVersion` function. Make sure you "Connect your Wallet" before hitting "Write" and signing the transaction.

![Etherscan](https://res.cloudinary.com/dacofvu8m/image/upload/v1682466427/Screen_Shot_2023-04-25_at_19.46.58_nlo9p1.png)

For some context:

- `subdomain`: The subdomain name of your plugin. Whatever you write here should be hyphenated (i.e. `my-plugin`) and should be unique.
- `pluginSetupAddress`: The address of your deployed Plugin Setup contract (i.e. `0x3018f7712b77744A31277511609238399f0A26h8`).
- `maintainer`: The address owner of that plugin (i.e. `0x87789071456774411227751100h89g899fg6679`).
- `releaseMetadata`: The URI of the data regarding the release of this plugin (i.e. `0x87789071456774411227751100h89g899fg6679`). If you don't have any as of now, simply pass `0x00`. You get this address by uploading your metadata object to IPFS.
- `buildMetadata`: The URI of the data regarding this specific build implementation (i.e. `0x87789071456774411227751100h89g899fg6679`). If you don't have any as of now, simply pass `0x00`. You get this address by [uploading your metadata object to IPFS](https://docs.infura.io/infura/tutorials/ethereum/create-an-nft-using-truffle/upload-nft-metadata-to-ipfs).

#### Option B: Programmatically publish with a script

You may want to have a publishing script directly off of your Hardhat project. In that case, you may want to check out our [publishing script and additional helpers here](https://github.com/aragon/simple-storage-example-plugin/blob/main/deploy/02_repo/10_publish_r1b1_in_new_repo.ts).

```js
import buildMetadata1 from '../../contracts/release1/build1/build-metadata.json';
import releaseMetadata1 from '../../contracts/release1/release-metadata.json';
import {networkNameMapping, osxContracts, addDeployedContract} from '../../utils/helpers';
import {toHex} from '../../utils/ipfs-upload';
import {uploadToIPFS} from '../../utils/ipfs-upload';
import {findEventTopicLog} from '@aragon/osx-commons-sdk';
import {
  PluginRepoFactory__factory,
  PluginRepoRegistry__factory,
  PluginRepo__factory,
} from '@aragon/osx-ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, network} = hre;
  const [deployer] = await hre.ethers.getSigners();

  // Get the plugin factory address
  let pluginRepoFactoryAddr: string;
  if (isLocal(network)) {
    const hardhatForkNetwork = process.env.HARDHAT_FORK_NETWORK
      ? process.env.HARDHAT_FORK_NETWORK
      : 'mainnet';

    pluginRepoFactoryAddr = osxContracts[hardhatForkNetwork].PluginRepoFactory;
    console.log(
      `Using the ${hardhatForkNetwork} PluginRepoFactory address (${pluginRepoFactoryAddr}) for deployment testing on network ${network.name}`
    );
  } else {
    pluginRepoFactoryAddr = osxContracts[networkNameMapping[network.name]].PluginRepoFactory;

    console.log(
      `Using the ${
        networkNameMapping[network.name]
      } PluginRepoFactory address (${pluginRepoFactoryAddr}) for deployment...`
    );
  }

  const pluginRepoFactory = PluginRepoFactory__factory.connect(pluginRepoFactoryAddr, deployer);

  // Upload the metadata
  const releaseMetadataURI = `ipfs://${await uploadToIPFS(
    JSON.stringify(releaseMetadata1),
    false
  )}`;
  const buildMetadataURI = `ipfs://${await uploadToIPFS(JSON.stringify(buildMetadata1), false)}`;

  console.log(`Uploaded metadata of release 1: ${releaseMetadataURI}`);
  console.log(`Uploaded metadata of build 1: ${buildMetadataURI}`);

  const pluginName = 'simple-storage';
  const pluginSetupContractName = 'SimpleStorageR1B1Setup';

  const setupR1B1 = await deployments.get(pluginSetupContractName);

  // Create Repo for Release 1 and Build 1
  const tx = await pluginRepoFactory.createPluginRepoWithFirstVersion(
    pluginName,
    setupR1B1.address,
    deployer.address,
    toHex(releaseMetadataURI),
    toHex(buildMetadataURI)
  );
  const eventLog = await findEventTopicLog(
    tx,
    PluginRepoRegistry__factory.createInterface(),
    'PluginRepoRegistered'
  );

  const pluginRepo = PluginRepo__factory.connect(eventLog.args.pluginRepo, deployer);

  console.log(`"${pluginName}" PluginRepo deployed at: ${pluginRepo.address} with `);

  addDeployedContract(network.name, 'PluginRepo', pluginRepo.address);
  addDeployedContract(network.name, pluginSetupContractName, setupR1B1.address);
};

export default func;
func.tags = ['SimpleStoragePluginRepo', 'PublishSimpleStorageR1B2'];
```

### 3. Publishing subsequent builds

When publishing subsquent builds, you want to use the `createVersion` function in the `PluginRepo` contract ([check out the function's source code here](https://github.com/aragon/osx/blob/develop/packages/contracts/src/framework/plugin/repo/PluginRepo.sol#L128)).

Similar as above, you can publish the new version on Etherscan directly or through a publishing script.
