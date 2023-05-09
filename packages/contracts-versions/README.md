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

Import Active contracts:

```javascript
// import active contracts from a specific version
import {v1_2_0_active_contracts} from '@aragon/osx-versions';

const mumbaiActiveContracts = v1_2_0_active_contracts.mumbai;
```

Import a specific contract source code from a specific version:

```solidity

// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

// import legacy contracts from a specific version
import {DAO} from '@aragon/osx-versions/versions/v1_0_1/contracts/core/dao/DAO.sol';

// .....
```

### Generate typechain

To generate TypeChain if needed:

```console
find <path-to>/artifacts/@aragon/osx-versions/versions/ -name '*.json' -type f | grep -v '.dbg.json' | xargs typechain --target=ethers-v5 --out-dir <path-to>/typechain/osx-versions/versions/"
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

This project is licensed under the AGPL-3.0-or-later License.
