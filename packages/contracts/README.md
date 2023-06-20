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
MANAGINGDAO_SUBDOMAIN=management
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

## Testing

The `@aragon/osx` and `@aragon/osx-ethers` packages allow you to work with previous versions of the contracts by using npm aliases. This is useful for testing contracts against different versions without having to manage multiple copies of the contracts within the repository.

If you want to import and test a contract from a previous version, you can directly import it using the npm alias. For instance:

```solidity
import '@aragon/osx-v1.0.1/{path_to_contract}.sol';
```

Replace {path_to_contract} with the actual path to the contract within the osx package version 1.0.1.

After successful contract compilation, TypeChain typings can be automatically generated. This will allow you to interact with the contract in a type-safe manner in your tests.

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
} from '@aragon/osx-ethers-v1.2.0/contracts/core/dao/DAO.sol';

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

```

```
