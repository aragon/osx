# Aragon Core

This workspace contains the Core foundation of the Aragon ecosystem - the human centered approach to DAO's.

For more information on the individual packages, please read the respective `Readme.md`.

## Setup

Start by running `yarn install` in the root.

### Dependencies

Since the repo is set up as yarn workspace, all the linking is done automatically.

## Releasing

To release a new version of the NPM packages and the contracts add one of these labels `release:patch`, `release:minor` and `release:major`.  
This triggers the deployment of the contracts to the networks defined under `packages/contracts/networks.json`. Merges to `develop` triggers a release to testnets and merges to `main` releases to the mainnets.  
The labels also indicate how the npm packages will be bumped to the next version:

| Label         | Version bump                                                                |
| ------------- | --------------------------------------------------------------------------- |
| release:patch | patch bump for `@aragon/core-contracts` and `@aragon/core-contracts-ethers` |
| release:minor | minor bump for `@aragon/core-contracts` and `@aragon/core-contracts-ethers` |
| release:major | major bump for `@aragon/core-contracts` and `@aragon/core-contracts-ethers` |
