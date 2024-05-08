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

To get started running your repository locally:

Copy `.env.example` into a file called `.env` or create a new one with these 3 keys defined:

```sh
# keys used for running tests
HARDHAT_DAO_ENS_DOMAIN=dao.eth
HARDHAT_PLUGIN_ENS_DOMAIN=plugin.eth
MANAGEMENT_DAO_SUBDOMAIN=management
```

Run these commands on the project's root folder in your terminal:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
npx hardhat help
REPORT_GAS=true npx hardhat test
npx hardhat coverage
npx hardhat run scripts/deploy.ts
TS_NODE_FILES=true npx ts-node scripts/deploy.ts
npx eslint '**/*.{js,ts}'
npx eslint '**/*.{js,ts}' --fix
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```

## Documentation

You can find all documentation regarding how to use this protocol in [Aragon's Developer Portal here](https://devs.aragon.org).

## Contributing

If you like what we're doing and would love to support, please review our `CONTRIBUTING_GUIDE.md` [here](https://github.com/aragon/osx/blob/develop/CONTRIBUTION_GUIDE.md). We'd love to build with you.

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
import {MyContract} from '@aragon/osx-ethers-v1.2.0/{path_to_MyContract}';
import {MyContract____factory} from '@aragon/osx-ethers-v1.2.0/{path_to_MyContract__factory}';

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
import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {
  DAO as DAO_V1_3_0,
  DAO__factory as DAO_V1_3_0_factory,
} from '@aragon/osx-ethers-v1.3.0/contracts/core/dao/DAO.sol';

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

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).

# Releases

Contract releases are tracked in [Releases.md](Releases.md)
