# Deployment Checklist

This checklist is seen as a guide to deploy the contracts to a new chain.

## Pre-Deployment

- [ ] Run `yarn` in the repository root to install the dependencies.
- [ ] Run `yarn build` in `packages/contracts` to make sure the contracts compile.
- [ ] Run `yarn test` in `packages/contracts` to make sure the contract tests succeed.
  - To run the tests, edit `packages/contracts/.env` to contain:
    ```
    HARDHAT_DAO_ENS_DOMAIN=testdao.eth
    HARDHAT_PLUGIN_ENS_DOMAIN=testpluginrepo.eth
    MANAGINGDAO_SUBDOMAIN=mgmt-test
    ```
- [ ] Verify that the deployers wallet has sufficient funds to complete a protocol deployment.
- [ ] Go to `packages/contracts/networks.json` and add your custom network to which you want to deploy to.

  If contract verification is not available for your chain:

  - Ensure that the `deploy` key for the new network looks exactly like: <br>
    `"deploy": ["./deploy/new"]`

  If your chain does support contract verification:

  - Define the `deploy` key like: <br>
    `"deploy": ["./deploy/new", "./deploy/verification"]`.
  - Define the `ETHERSCAN_KEY` variable for contract verification on the `.env` file. [Follow the HardHat guide](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify) in such case.

- [ ] The Management DAO will govern the protocol/framework and its rules. Go to `packages/contracts/deploy/management-dao-metadata.json` and update its human readable values as you wish. This is deployed to the IPFS and the CID will be stored in the managing DAO, so users may get information about it.
- [ ] Update `.env` to add the deployment wallet's private key under `ETH_KEY`. Example:
  ```jsx
  ETH_KEY = YOUR_PRIVATE_KEY; // without `0x` prefix
  ```
- [ ] Define the settings of the ENS domain used by OSx.
  - Define the following ENS names in the `packages/contracts/.env` file, by replacing `SEPOLIA` with the name of the network name you’re deploying to:

    ```
    SEPOLIA_DAO_ENS_DOMAIN="testdao.eth"
    SEPOLIA_PLUGIN_ENS_DOMAIN="testplugin.eth"
    ```

  - Ensure that domains end with a suffix like `.eth`
  - If the target chain has an official ENS registry:
    - Ensure that the wallet under `ETH_KEY` owns the domain
    - If you created the domains via the ENS app, they will be owned by an ENS wrapper which would cause the script to fail
      - Ensure to go [open the ENS app](https://app.ens.domains/) and click `unwrap` for each of these domains.
      - [Example](https://app.ens.domains/morpheusplugin3.eth?tab=more)
  - If the target chain does not have an official ENS registry:
    - A new, unofficial ENS registry and a Resolver will be deployed
    - No ownership is needed, the Managing DAO will own them

- [ ] Finally, edit `packages/contracts/.env` and add `MANAGINGDAO_SUBDOMAIN`.
  - Define a name for the subdomain, without any suffix.
  - Example: to get `management.testdao.eth` you would define:
```jsx
MANAGINGDAO_SUBDOMAIN = management;
```

---

When all the settings are correctly defined:

```sh
cd packages/contracts               # if needed
yarn deploy --network <NETWORK>     # Replace with mainnet, polygon, sepolia, etc
```


- NOTE that after the script is run and finished, deployer will be the only one, having `ROOT_PERMISSION` on your managing dao. This allows you to deploy/install plugin separately, but note that the same deployer's private key must be used for the plugin deployment/installation. After the plugin is installed, it's important to revoke `EXECUTE_PERMISSION` on the deployer.
- In case the script fails in the middle, try to rerun it again, in which case, it won’t start deploying contracts from scratch, but re-use already deployed contracts.
- If everything worked smoothly, all the deployed contracts' addresses can be found in the `packages/contracts/deployed_contracts.json`.
