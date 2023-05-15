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

The Aragon OSX-versions allows you to work with previous versions of the contracts. These versions are available in the contracts-versions/ directory. For a detailed explanation of each contract version and its build, please refer to the README.md [here](https://github.com/aragon/osx/blob/develop/packages/contracts/README.md).

If you want to import and test a contract from a previous version, you must first import the contract into contracts/src/tests/osx-versions/Migration.sol. This step is necessary for the contract to be compiled.

```solidity
// contracts/src/tests/osx-versions/Migration.sol

import '../../contracts-versions/{version}/{path_to_contract}.sol';

// Replace {version} with the version number of the contract, and {path_to_contract} with the actual path to the contract.
```

After successfully compiling the contract, TypeChain typings will be automatically generated and placed in the typechain/osx-versions/ directory. This will allow you to interact with the contract in a type-safe manner in your tests.

```javascript
// Example of usage in a test
import {ethers} from 'hardhat';
import {ContractName} from '../../../typechain/osx-versions/{version}/{path to ContractName}';
import {ContractName__factory} from '../../../typechain/osx-versions/{version}/{path to ContractName__factory}';

describe('ContractName Test', function () {
  let contractName: ContractName;

  beforeEach(async function () {
    const signers = ethers.getSigners();
    const ContractNameFactory = new ContractName__factory(signers[0]);
    contractName = await ContractNameFactory.deploy();
  });

  it('Should do something', async function () {
    const result = await contractName.someFunction();
    expect(result).to.equal(something);
  });
});
```

Please replace 'ContractName' with the actual name of your contract, and follow the same for the other placeholders (someFunction, something). This is an illustrative example, the actual test case will depend on the specific methods and functionality of your contract.

# Performance optimizations

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).

# Releases

Contract releases are tracked in [Releases.md](Releases.md)
