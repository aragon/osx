# Aragon OSx Contracts Versions

A package to manage different contract versions and provide easy access to their ABI, types, and active contracts.

## Installation

```bash
npm install @aragon/osx-versions
```

or

```bash
yarn add @aragon/osx-versions
```

## Usage

```javascript
// import specific version
import {v0_7_0_alpha_active_contracts, v0_7_0_alpha_typechain} from '@aragon/osx-versions';

const typechain = v0_7_0_alpha_typechain;
const idao: v0_7_0_alpha_typechain.IDAO = typechain.IDAO__factory.connect(
  ethers.constants.AddressZero,
  ethers.providers.getDefaultProvider()
);
```

## Adding new contract versions

1. Update `commit_hashes.json` with the new version name and the associated commit hash.
2. Run the `create-contract-versions.ts` script to build and generate the new version:

```bash
yarn build:contracts
```

3. Run the Rollup build process:

```bash
yarn build:npm
```

## Contributing

Contributions are welcome! Feel free to open a pull request or create an issue to report bugs or request features.

## License

This project is licensed under the AGPL-3.0-or-later License..
