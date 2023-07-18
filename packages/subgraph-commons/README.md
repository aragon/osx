# Aragon OSx Subgraph Commons

The `@aragon/osx-subgraph-commons` package provides a collection of utilities for the creation and management of subgraphs for the Aragon DAO Framework.

## Installation

To add this package to your project, navigate to your project's root directory and run:

```bash
yarn add @aragon/osx-subgraph-commons
```

## Usage

After installing @aragon/osx-subgraph-commons, you can import and use its functions in your Subgraph project.

Example:

```ts
import {getDaoId} from '@aragon/osx-subgraph-commons';

const daoId = getDaoId('some-dao-address');
console.log(`The DAO ID is: ${daoId}`);
```

In this example, the getDaoId function is used to generate a DAO ID from a given Ethereum address.
