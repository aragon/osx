# Deployment Checklist

This checklist is seen as a guide to deploy the stack to a new chain.

## Pre-Deployment

- [ ] Verify that the deployers wallet has enough funds.
- [ ] Check that you are using Node v16
- [ ] Check that you are using the intended `@aragon/osx-commons-contracts` package version.
- [ ] Check that the OSx protocol version in `@aragon/osx-commons-contracts/src/utils/versioning/ProtocolVersion.sol` is bumped correctly.
- [ ] Check that the semver number in `osx/packages/contracts/src/package.json` matches with that of `@aragon/osx-commons-contracts`. The pre-release suffix is allowed to differ.
- [ ] Check that the version tags in the `/// @dev vX.Y (Release X, Build Y)` NatSpec comments of the plugin implementation and setup contracts are correct.
- [ ] Check that version tags are set correctly in the plugin repo deploy scripts `packages/contracts/deploy/new/30_plugins/10_plugin-repos` to ensure synchronized version numbers across all supported networks.
- [ ] Choose an ENS domain for DAOs
- [ ] Choose an ENS domain for plugins
- [ ] Check if there is an official ENS deployment for the chosen chain and if yes:
  - [ ] Check if there is already an entry for it in `packages/contracts/deploy/helpers.ts`
  - [ ] Check that the owner of the DAO domain is the deployer
  - [ ] Check that the owner of the plugin domain is the deployer
- [ ] Run `yarn` in the repository root to install the dependencies
- [ ] Run `yarn build` in `packages/contracts` to make sure the contracts compile
  - [ ] Check that the compiler version in `hardhat.config.ts` is set to at least `0.8.17` and on the [known solidity bugs page](https://docs.soliditylang.org/en/latest/bugs.html) that no relevant vulnerabilities exist that are fixed in later versions. If the latter is not the case, consider updating the compiler pragmas to a safe version and rolling out fixes for affected contracts.
- [ ] Run `yarn test` in `packages/contracts` to make sure the contract tests succeed
- [ ] Run `yarn deploy --deploy-scripts deploy/new --network hardhat --reset` to make sure the deploy scripts work
- [ ] Set `ETH_KEY` in `.env` to the deployers private key
- [ ] Set the right API key for the chains blockchain explorer in `.env` (e.g. for mainnet it is `ETHERSCAN_KEY`)
- [ ] Set the chosen DAO ENS domain (in step 1) to `NETWORK_DAO_ENS_DOMAIN` in `.env` and replace `NETWORK` with the correct network name (e.g. for mainnet it is `MAINNET_DAO_ENS_DOMAIN`)
- [ ] Set the chosen Plugin ENS domain (in step 2) to `NETWORK_PLUGIN_ENS_DOMAIN` in `.env` and replace `NETWORK` with the correct network name (e.g. for mainnet it is `MAINNET_PLUGIN_ENS_DOMAIN`)
- [ ] Set the subdomain to be used of the management DAO to `MANAGEMENT_DAO_SUBDOMAIN` in `.env`. If you want to use `management.dao.eth` put only `management`
- [ ] Set the multisig members of the management DAO as a comma (`,`) separated list to `MANAGEMENT_DAO_MULTISIG_APPROVERS` in `.env`
- [ ] Set the amount of minimum approvals the management DAO needs to `MANAGEMENT_DAO_MULTISIG_MINAPPROVALS` in `.env`
- [ ] If new plugin builds are released
  - [ ] Double-check that the build- and release-metadata is published correctly by the deploy script and contracts
- [ ] Check all the tags and `func.dependencies` to ensure the `00-env-check.ts` file is executed at the beginning of the deployment.

## Deployment

To deploy run `yarn deploy --network NETWORK` in `packages/contracts` and replace `NETWORK` with the correct network name (e.g. for mainnet it is `yarn deploy --network mainnet`)

## After-Deployment

### Configuration updates

- [ ] Take the addresses from this file `packages/contracts/deployed_contracts.json`
- [ ] Add the new deployment to the `@aragon/osx-commons-config` package found here: [https://github.com/aragon/osx-commons/tree/develop/configs](https://github.com/aragon/osx-commons/tree/develop/configs)
- [ ] Update `packages/contracts/Releases.md` with the new deployed addresses
- [ ] Add the management DAOs' multisig address to `packages/contracts/.env.example` in the format `{NETWORK}_MANAGEMENT_DAO_MULTISIG`
- [ ] Add a Github Release with the version number as tag and the defined content (check previous releases for reference)

### Verification

- [ ] Take the addresses from this file `packages/contracts/deployed_contracts.json`
- [ ] Wait for the deployment script finishing verification
- [ ] Go to the blockchain explorer and verify that each address is verified
  - [ ] If it is not try to verfiy it with `npx hardhat verify --network NETWORK ADDRESS CONTRUCTOR-ARGS`. More infos on how to use this command can be found here: [https://hardhat.org/hardhat-runner/docs/guides/verifying](https://hardhat.org/hardhat-runner/docs/guides/verifying)
  - [ ] If it is a proxy try to activate the blockchain explorer's proxy feature
  - [ ] If the proxies are not verified with the `Similar Match Source Code` feature
    - [ ] Verify one of the proxies
    - [ ] Check if the other proxies are now verified with `Similar Match Source Code`
  - [ ] If it is a `PluginSetup`, check that the implementation is verified.

### Configurations

- [ ] Check that all management DAO signers are members of the management DAO multisig and no one else.
- [ ] Check if the management DAO is set in the `DAO_ENSSubdomainRegistrar`
- [ ] Check if the management DAO is set in the `Plugin_ENSSubdomainRegistrar`
- [ ] Check if the management DAO is set in the `DAORegistry`
- [ ] Check if the `DAO_ENSSubdomainRegistrar` is set in the `DAORegistry`
- [ ] Check if the management DAO set in the `PluginRepoRegistry`
- [ ] Check if the `Plugin_ENSSubdomainRegistrar` is set in the `PluginRepoRegistry`
- [ ] Check if the `PluginRepoRegistry` is set in the `PluginRepoFactory`
- [ ] Check if the `PluginRepoRegistry` is set in the `PluginSetupProcessor`
- [ ] Check if the `DAORegistry` is set in the `DAOFactory`
- [ ] Check if the `PluginSetupProcessor` is set in the `DAOFactory`
- [ ] Check that the versions (and eventual `PlaceholderSetup` builds) are published correctly in the `token-voting-repo`, `address-list-voting-repo`, `multisig-repo`, and `admin-repo` and are synchronized across all supported networks.

### Permissions

- [ ] Check that the deployer has not the ROOT permission on the management DAO
- [ ] Check if `DAO_ENSSubdomainRegistrar` is approved for all for the DAO' ENS domain. Call `isApprovedForAll` on the ENS registry with the management DAO as the owner and the `DAO_ENSSubdomainRegistrar` as the operator.
- [ ] Check if `Plugin_ENSSubdomainRegistrar` is approved for all for the plugin' ENS domain. Call `isApprovedForAll` on the ENS registry with the management DAO as the owner and the `Plugin_ENSSubdomainRegistrar` as the operator.
- [ ] Check if the `DAORegistry` has `REGISTER_ENS_SUBDOMAIN_PERMISSION` on `DAO_ENSSubdomainRegistrar`
- [ ] Check if the `PluginRepoRegistry` has `REGISTER_ENS_SUBDOMAIN_PERMISSION` on `Plugin_ENSSubdomainRegistrar`
- [ ] Check if the `DAOFactory` has `REGISTER_DAO_PERMISSION` on `DAORegistry`
- [ ] Check if the `PluginRepoFactory` has `REGISTER_PLUGIN_REPO_PERMISSION` on `PluginRepoRegistry`

### Packages

- [ ] Publish a new version of `@aragon/osx-artifacts` (`./packages/contracts`) to NPM
- [ ] Publish a new version of `@aragon/osx` (`./packages/contracts/src`) to NPM
- [ ] Publish a new version of `@aragon/osx-ethers` (`./packages/contracts-ethers`) to NPM
- [ ] Update the changelog with the new version

## Appendix

- Changing the owner of the chosen ENS domains will also revoke the permissions of the `DAO_ENSSubdomainRegistrar` and `Plugin_ENSSubdomainRegistrar`. Therefore if the ownership gets transfered, restore the approval for these 2 contracts.
