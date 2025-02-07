# Aragon OSx artifacts

This package contains the ABI definitions of the OSx contracts, as well as the address of the protocol instances deployed on each network. Install it with:

```sh
yarn add @aragon/osx-artifacts
```

## Usage

```typescript
// ABI definitions
import {
    DAO,
    IDAO,
    DAOFactory,
    DAORegistry,
    PluginRepo,
    PluginRepoFactory,
    PluginRepoRegistry,
    PluginSetupProcessor,
    PermissionManager
} from "@aragon/osx-artifacts";

console.log("DAO ABI", DAO.abi);
console.log("DAO bytecode", DAO.bytecode);

console.log("IDAO ABI", IDAO.abi);

// Protocol addresses per-network
import { addresses } from "@aragon/osx-artifacts";

console.log(addresses.daoFactory);
```

You can also open [addresses.json](./src/addresses.json) directly.

## Development

### Building the package

Install the dependencies and generate the local ABI definitions.

```sh
yarn install
yarn build
```

The `build` script will:
1. Move to `packages/contracts`.
2. Install its dependencies.
3. Compile the contracts using Hardhat.
4. Generate their ABI.
5. Extract their ABI and embed it into on `src/abi.ts`.

### Publish to NPM

Ensure the package `version` is up to date within `package.json` before publishing.

Check that only the intended files will be published:
```sh
yarn publish --dry-run
```

To publish the package to NPM, run:
```sh
yarn publish --access public
```

## Documentation

You can find all documentation regarding how to use this plugin in [Aragon's documentation here](https://docs.aragon.org/osx-contracts/1.x/index.html).

## Contributing

If you like what we're doing and would love to support, please review our `CONTRIBUTING_GUIDE.md` [here](https://github.com/aragon/osx/blob/main/CONTRIBUTION_GUIDE.md). We'd love to build with you.

## Security

If you believe you've found a security issue, we encourage you to notify us. We welcome working with you to resolve the issue promptly.

Security Contact Email: sirt@aragon.org

Please do not use the issue tracker for security issues.
