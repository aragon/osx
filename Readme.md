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

| Label         | Version bump                                                              |
| ------------- | ------------------------------------------------------------------------- |
| release:patch | patch bump for `@aragon/osx-contracts` and `@aragon/osx-contracts-ethers` |
| release:minor | minor bump for `@aragon/osx-contracts` and `@aragon/osx-contracts-ethers` |
| release:major | major bump for `@aragon/osx-contracts` and `@aragon/osx-contracts-ethers` |

## Pull request commands

Certain actions can be triggered via a command to a pull request. To issue a command just comment on a pull request with one of these commands.

| Command                                      | Description                                                 |
| -------------------------------------------- | ----------------------------------------------------------- |
| `/mythx partial (quick \| standard \| deep)` | Scans the changed files for this pull request               |
| `/mythx full (quick \| standard \| deep)`    | Scans the all files for this pull request                   |
| `/release (patch \| minor \| major)`         | Adds the proper release label to this pull request          |
| `/subgraph (patch \| minor \| major)`        | Adds the proper subgraph release label to this pull request |
