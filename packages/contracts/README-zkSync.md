# ZkSync

ZkSync uses a zkEVM and so has different considerations.

1. Ensure contracts are compiled with the zkSolc compiler

- In your `hardhat.config.ts`, ensure the zkSync packages are uncommented, and the non-zkSync contracts that cause conflicts are commented out.

```bash
# Build your contracts with zkSolc
yarn build --network zkSyncLocal

# build with solc to ensure artifacts are present
yarn build
```

2. Start a zkNode

```bash
# Start a zkSync node in a second terminal
yarn node-zkSync
```

3. Execute tests

```bash
yard test --network zkLocalTestnet
```

You may need to configure tests to use custom matchers and wrappers. These are handled by wrapper and matcher files

TODO: add more details on how to configure tests for zkSync
