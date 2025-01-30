# Aragon OSx Protocol contracts

Welcome to the contracts powering the Aragon OSx Protocol!

Install the NPM package to import the solidity source files or the contract artifacts:

```sh
# solidity source files
yarn add @aragon/osx

# JSON ABI and bytecode
yarn add @aragon/osx-artifacts
```

## Get Started

Before starting make sure that you have created an `.env` file from the `.env.example` file and filled in the Alchemy API key. Feel free to add other API keys for the services that you want to use.

Now you can get started running your repository locally:

1. Install packages from the root folder with `yarn`
2. Change directory into this package (`/pacakages/contracts`)
3. Run `yarn build` to compile the contracts
4. Run `yarn test` to execute the test suite (this can take a while, so see [performance optimizations](#performance-optimizations) for ways to speed up the tests).

## Deployment

Deployments use [hardhat-deploy](https://github.com/wighawag/hardhat-deploy), and follow most of the conventions in the HH deploy docs.

See the [deployment checklist](../../DEPLOYMENT_CHECKLIST.md) for full details on how to deploy the contracts to a proper network.

When testing locally:

1. `yarn deploy` will run the test scripts against the local hardhat node.
2. `yarn dev` will spin up a persistent hardhat node and execute the deploy script against it automatically.
3. `yarn deploy:reset` will clear any prior deploy state stored by hardhat deploy.
4. `yarn deploy:local` will deploy a against a persistent localhost fork, clearing the deploy state between runs

Default values for all required environment variables are provided when running against hardhat, check the [`.env.example`](./.env.example) for details of what these are and what they mean.

The private key provided by default is a hardhat publically known key for `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`. Don't use it outside of a local development context.

> Tests can be sped up if needed. See [the test performance optimization](#performance-optimizations) section for more info.

## Documentation

You can find all documentation regarding how to use this protocol in [Aragon's Developer Portal here](https://devs.aragon.org).

## Contributing

If you like what we're doing and would love to support, please review our `CONTRIBUTING_GUIDE.md` [here](https://github.com/aragon/osx/blob/develop/CONTRIBUTION_GUIDE.md). We'd love to build with you.

## Security

If you believe you've found a security issue, we encourage you to notify us. We welcome working with you to resolve the issue promptly.

Security Contact Email: sirt@aragon.org

Please do not use the issue tracker for security issues.

## Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum testnet that's supported by Etherscan, such as [goerli](https://goerli.etherscan.io) or [sepolia](https://sepolia.etherscan.io).

In this project, copy the `.env.example` file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Goerli node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network goerli scripts/sample-script.ts
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network goerli DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```

## Testing with Previous Contract Versions

The `@aragon/osx` and `@aragon/osx-ethers` packages facilitate working with earlier versions of contracts by utilizing npm aliases. This is advantageous for testing contracts against varying versions without having to maintain multiple instances of the contracts within the repository.

Here's a step-by-step guide to import and test a contract from a previous version:

### Step 1: Add the Previous Version as an Alias in package.json

First, add an alias to your `package.json` under the `dependencies` section. This alias points to the specific version of the package you want to use.

For example, to use version 1.0.1 of the `@aragon/osx` package, add the following:

```json
"dependencies": {
  "@aragon/osx-v1.0.1": "npm:@aragon/osx@1.0.1"
}
```

### Step 2: Install Dependencies

Now, run the yarn install command to install the dependencies:

```sh
yarn install
```

### Step 3: Update OSX_VERSION_ALIASES in the Script

Next, you need to inform the typechain generator script about this new alias. Open the script `/scripts/osx-version-aliases.ts` and append the alias name to the `OSX_VERSION_ALIASES` array:

```ts
export const OSX_VERSION_ALIASES = ['@aragon/osx-v1.0.1/'];
```

### Step 4: Import the Contract in Your Solidity File

Now, you can import the desired contract using the alias you've set. Replace `{path_to_contract}` with the actual path to the contract within the osx package version you are using (in this example, version 1.0.1).

```solidity
import '@aragon/osx-v1.0.1/{path_to_contract}.sol';
```

After successful contract compilation, TypeChain typings will be automatically generated. This will allow you to interact with the contract in a type-safe manner in your tests.

Here is a generic example of usage in a test:

```ts
import {MyContract____factory} from '@aragon/osx-ethers-v1.2.0/{path_to_MyContract__factory}';
import {MyContract} from '@aragon/osx-ethers-v1.2.0/{path_to_MyContract}';

describe('MyContract Test', function () {
  let myContract: MyContract;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    const myContractFactory = new MyContract__factory(signers[0]);
    myContract = await myContractFactory.deploy();
  });

  it('Should do something', async function () {
    const result = await myContract.someFunction();
    expect(result).to.equal(something);
  });
});
```

Please replace 'MyContract' with the actual name of your contract, and follow the same approach for the other placeholders (someFunction, something). This is an illustrative example; the actual test case will depend on the specific methods and functionality of your contract.

Example of usage in a test:

```ts
// chai-setup imports additional matchers used for mocking
import {expect} from './chai-setup';
import {
  DAO as DAO_V1_3_0,
  DAO__factory as DAO_V1_3_0_factory,
} from '@aragon/osx-ethers-v1.3.0/contracts/core/dao/DAO.sol';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';

describe('Legacy Test Example', function () {
  let signers: SignerWithAddress[];
  let daoV1_3_0: DAO_V1_3_0;

  before(async function () {
    signers = await ethers.getSigners();
    const factory = new DAO_V1_3_0__factory(signers[0]);
    daoV1_3_0 = await DAO_V1_3_0.deployWithProxy<DAO_V1_3_0>(factory);
  });

  it('should be version 1.3.0', async function () {
    const result = await daoV1_3_0.protocolVersion();
    expect(result).to.equal([1, 3, 0]);
  });
});
```

# Performance optimizations

There are 3 ways to run tests:

1. `yarn test` runs tests in sequence. Can take a while but is the default.

2. `yarn test:parallel`, depending on your hardware can be significantly faster and is generally good for most cases. See the [hardhat docs](https://hardhat.org/hardhat-runner/docs/guides/test-contracts#running-tests-in-parallel) for more information about parallelized testing. Not suitable for gas reports (see below)

3. `yarn test:gas-report` outputs a gas report. Cannot be run in parallel mode.

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).

# Releases

Contract releases are tracked in [Releases.md](Releases.md)

### Deployment

This guide will show how to deploy the framework contracts on a new chain and then deploy plugin repositories after that.

Before actually trying to deploy osx on the actual testnet or mainnet chains, it's adviseable to test deploying locally. For this, we will use hardhat node's feature. In the separate terminal, run:

```js
npx hardhat node --fork FORK_URL_NETWORK_YOU_ARE_DEPLOYING_TO --no-deploy
```

Make sure that this spins up the forked blockchain on 8545 port. This is important as if it runs on another port, the deployment will not work.

Once you're done with this, go to `packages/contracts`. Create an `.env` file with the following variables. It's important that `NETWORK_NAME` and `NETWORK_RPC_URL` is set as exactly below. All other environment variables are also required. In case one of them is not present, unexpected behaviour might occur, so we do NOT recommend leaving them empty.

```js
NETWORK_NAME=local
CHAIN="sepolia" # for now, `sepolia` is fine. TODO:
PRIVATE_KEY=YOUR_PRIVATE_KEY_ON_THE_FORKED_CHAIN_OF_8545_PORT
NETWORK_RPC_URL=http://127.0.0.1:8545

USE_ENS_FOR_PLUGIN=true # If you want to use ENS such that plugin repos can have ens names.
USE_ENS_FOR_DAO=true # If you want to support ENS such that daos can have ens names.
MANAGEMENT_DAO_SUBDOMAIN= # In case you want a ens subdomain for your managing dao.

PROTOCOL_VERSION="v1.3.0" # Protocol version that osx is using at the time of deployment.
ALCHEMY_API_KEY=
PUB_PINATA_JWT= # You can retrive this after registering on Pinata.
ETHERSCAN_API_KEY=
VERIFIER='etherscan'
```

```sh
make deploy-framework # runs the simulation(doesn't broadcast the transactions).
make broadcast=true deploy-framework # Broadcasts the transactions. If succeeds, this will also create deployed-contracts.json file with all information about the deployed contracts.
```

Once we deploy the framework, we're ready to move to plugin repository deployments. Which plugin repos will be deployed, are described inside `repos.yml` file.

```sh
# You can get `pluginrepofactory` address from deployed-contracts.json
# This will go through all the repositories, pull them, compile and build them
# and then deploy each one of them on the same `NETWORK_RPC_URL` provided in .env file.
make pluginrepofactory=ADDRESS deploy-repos
```

If everything results in success, it's time that we deployed on the actual testnets. For this, let's choose `sepolia` as an example. All we have to do is change `NETWORK_NAME` to `sepolia` and `NETWORK_RPC_URL` to the sepolia's RPC URL. After this, we run:

```sh
# We run this without a broadcast flag just to ensure that
# simulation also works on the actual sepolia rpc url.
make deploy-framework
```

Then, we actually broadcast it:

```sh
make broadcast=true deploy-framework
```

You can again copy the plugin repo factory address from the `deployed-contracts.json`. Now, it's time to deploy the plugin repos on the sepolia. What would be adviseable here is to ensure one more time that plugin repos can also be deployed successfully. For this, it's adviseable to deploy them in a forked environment..

Now, run:

```sh
# This will fork `NETWORK_RPC_URL` and try to deploy plugin repos on there.
make pluginrepofactory=ADDRESS_THAT_YOU_JUST_COPIED fork=true deploy-repos
```

If this also succeeds, we're finally ready to finish the deployment with:

```sh
make pluginrepofactory=ADDRESS_THAT_YOU_JUST_COPIED deploy-repos
```

// TODO: Better message ...

**Important:** Deployment uses couple of txs that must happen and succeed one after another. Even if tx `x` fails, `x-1, x-2, e.t.c` txs could succeed. As a recommendation, it's adviseable to note in the terminal which tx failed. If the failing tx is `factory.deployFramework`, that means ENS setups + factory deployment tx succeeded. In such case, if you re-run the script, it will still deploy this deployment factory contract which is cumbersome and costly. So as a guide, here is the steps to follow:

1. If all txs succeed, nothing to be done.
2. If ens related tx fails, you can re-run the script.
   3.a - If `factory.deployFramework` fails and if you didn't have official ens and resolver addresses specified in `getEnsRegistry` and `getEnsResolver` functions, you can copy the ens deployment addresses from the current terminal, paste them in those functions with the correct network name. Not only that,
   you should also copy the deployment framework factory address and put it in `.env` with the key: `DEPLOYMENT_FRAMEWORK_FACTORY`. Then, you can re-run the script..
   3.b - If `factory.deployFramework` fails and you had the official ens and resolver addresses specified in `getEnsRegistry` and `getEnsResolver` functions, then, only thing you should copy is the deployment framework factory address and put it in `.env` with the key: `DEPLOYMENT_FRAMEWORK_FACTORY`. Then, you can re-run the script..
