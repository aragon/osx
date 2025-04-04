# Aragon OSx Contracts for ethers.js

> NOTE: This package has been deprecated. Please, refer to [packages/artifacts](../artifacts/README.md) instead.

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

console.log(activeContractsList.sepolia.DAOFactory);
// '0x308a1DC5020c4B5d992F5543a7236c465997fecB'
console.log(activeContractsList.sepolia.MultisigSetup);
// '0x360586dB62DA31327B2462BA27bEb3e48ebbf396'
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
