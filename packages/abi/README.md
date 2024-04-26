# ABI publishing

To install dependencies:

```bash
yarn
```

## Available commands

### `build:contracts`

Builds the contracts in `../contracts`

```bash
yarn build:contracts
```

### `clean`

Deletes `generated` folder and `index.ts` file

```bash
yarn clean
```

### `generate:abi`

- Calls `build:contracts`
- Calls `clean`
- Generates the ABI files in `generated` folder from the contracts artifacts in `../contracts/artifacts/src`

```bash
yarn generate:abi
```

### `publish`

- Calls `generate:abi`
- Waits for an input on the user for the version of the package
- Asks for confirmation
- Publishes the package to the NPM

```bash
yarn publish
```
