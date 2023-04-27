# Aragon OSx Contracts Versions

A package to manage different contract versions and provide easy access to their ABI, types, and active contracts.

## Installation

```bash
npm install contracts-versions
```

or

```bash
yarn add contracts-versions
```

## Usage

```javascript
import versions from 'contracts-versions';

// Access specific contract version
const v0_7_0_alpha = versions.v0_7_0_alpha;

// Get the types for a specific version
v0_7_0_alpha.types().then(types => {
  // Use types here
});

// Get the active contracts for a specific version
v0_7_0_alpha.active_contracts().then(activeContracts => {
  // Use active contracts here
});
```

## Adding new contract versions

1. Update `commit_hashes.json` with the new version name and the associated commit hash.
2. Run the `create-contract-versions.js` script to build and generate the new version:

```bash
yarn build:contracts
```

3. Add the new version to the `versions` object in `npm/index.ts`.
4. Run the Rollup build process:

```bash
yarn build:npm
```

## Contributing

Contributions are welcome! Feel free to open a pull request or create an issue to report bugs or request features.

## License

This project is licensed under the AGPL-3.0-or-later License.
