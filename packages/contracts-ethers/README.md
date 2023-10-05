# Aragon OSx Contracts for ethers.js

NPM package that provides ethers.js wrappers to use the Aragon DAO framework smart contracts.

```sh
yarn add @aragon/osx-ethers
```

## Usage

### Attaching to a contract

```ts
import {
  DAOFactory__factory
} from "@aragon/osx-ethers";

// Use it
const daoFactoryInstance = DAOFactory__factory.connect(...);
```

### Getting the list of global contract addresses

```ts
import {activeContractsList} from '@aragon/osx-ethers';

console.log(activeContractsList.rinkeby.DAOFactory);
// '0x2290E6dF695C5272cE942015c90aAe24bFB94960'
console.log(activeContractsList.rinkeby.Registry);
// '0x5895B0B32d438f85872b164AE967B3E802d33750'
console.log(activeContractsList.rinkeby.TokenFactory);
// '0x84641573c077F12C73bd2612fe1d96AE58bE7D1a'
```

## Development

- Run `yarn` at the **root** of the monorepo, not on this folder.
- Then, in the `contracts-ethers` folder run:
  - `yarn run:contracts`
  - `yarn run`
  - `yarn run:npm`

## Contributing

If you like what we're doing and would love to support, please review our `CONTRIBUTING_GUIDE.md` [here](https://github.com/aragon/osx/blob/develop/CONTRIBUTION_GUIDE.md). We'd love to build with you.

## Security

If you believe you've found a security issue, we encourage you to notify us. We welcome working with you to resolve the issue promptly.

Security Contact Email: sirt@aragon.org

Please do not use the issue tracker for security issues.
