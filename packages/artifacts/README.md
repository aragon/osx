# @aragon/osx-artifacts

## Installation

    ```bash
    npm install @aragon/osx-artifacts
    ## or
    yarn add @aragon/osx-artifacts
    ```

## Usage

### 1.4.0, versions with `-viem` suffix and future versions

From version 1.4.0 onwards, the package exports the artifacts and the ABIs `as const` for viem users. To use them you can import the artifact or ABI you need directly from the package.

```ts
import {daoFactoryArtifact} from '@aragon/osx-artifacts';
import {daoFactoryAbi} from '@aragon/osx-artifacts/abi';

// Traditional artifacts
console.log(daoFactoryArtifact.abi);
console.log(daoFactoryArtifact.bytecode);
// ABIs as const oriented to viem users
console.log(daoFactoryAbi); // usable for viem users
```

### 1.3.1 and previous versions

Versions `1.3.1`and previous only export the json artifacts. To use them just import the artifacts and use them as needed.

```ts
import {DAOFactory} from '@aragon/osx-artifacts';

console.log(DAOFactory.abi);
console.log(DAOFactory.bytecode);
```

## Building

### Prerequisites

- Node.js -> 16.x

```bash
npm install
# or
yarn install
```

### Build all

This will build the contracts, generate viem abis and bundle the artifacts.

```bash
npm run build:all
# or
yarn build:all
```

### Build Contracts

This will build the contracts.

```bash
npm run build:contracts
# or
yarn build:contracts
```

### Generate viem ABIs

This will generate the viem ABIs.

```bash
npm run generate:abi
# or
yarn generate:abi
```

### Bundle Artifacts

This will bundle the artifacts.

```bash
npm run build
# or
yarn build
```

## Publishing

Will run a script that will ask for the version and will publish the package.

```bash
npm publish
# or
yarn publish
```
