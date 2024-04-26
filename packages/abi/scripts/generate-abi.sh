#!/bin/bash
## Build the contracts
yarn build:contracts
## Delete previous ABI files
yarn clean
## Generate the ABI files
wagmi generate -c wagmi.config.ts
## Generate index.ts file
echo "export * from './generated/abis.ts'" > './index.ts'
echo "ABI files generated successfully"