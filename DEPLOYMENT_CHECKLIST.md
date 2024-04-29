# Deployment Checklist

This checklist is seen as a guide to deploy the contracts to a new chain.

## Pre deployment

- [ ] Run `yarn` in the repository root to install the dependencies.
- [ ] Run `yarn build` in `packages/contracts` to make sure the contracts compile.
- [ ] Run `yarn test` in `packages/contracts` to make sure the contract tests succeed.
  - To run the tests, edit `packages/contracts/.env` to contain:

    ```env
    HARDHAT_DAO_ENS_DOMAIN="testdao.eth"
    HARDHAT_PLUGIN_ENS_DOMAIN="testpluginrepo.eth"

    MANAGINGDAO_SUBDOMAIN="management"
    ```
- [ ] Edit `packages/contracts/networks.json` and add your custom network to which you want to deploy to.

  If contract verification is not available for your chain:

  - Ensure that the `deploy` key for the new network looks exactly like: <br>
    `"deploy": ["./deploy/new"]`

  If contract verification is available:

  - Define the `deploy` key like: <br>
    `"deploy": ["./deploy/new", "./deploy/verification"]`.
  - Define the `ETHERSCAN_KEY` variable for contract verification on the `.env` file. [Follow the Hardhat guide](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify) in this case.

- [ ] Define the settings of the ENS domain used by OSx.

  - Define the following ENS names in the `packages/contracts/.env` file, by replacing `SEPOLIA` with the name of the network name you’re deploying to:

    ```env
    SEPOLIA_DAO_ENS_DOMAIN="my-dao.eth"
    SEPOLIA_PLUGIN_ENS_DOMAIN="my-dao.eth"
    ```

    - Ensure that domains end with a suffix like `.eth`

  - If the target chain does not have an official ENS registry:
    - A new, unofficial ENS registry will be deployed, along with a resolver
    - No ownership is needed, the Managing DAO will own them
  - If the target chain does have an official ENS registry:
    - Ensure that the wallet under `ETH_KEY` owns the domain
    - If you created the domains via the ENS app, they will be owned by an ENS wrapper which would cause the script to fail
      - [Open the ENS app](https://app.ens.domains/) and click `unwrap` for each of these domains.
      - [Example](https://app.ens.domains/morpheusplugin3.eth?tab=more)

- [ ] If desired, update `MANAGINGDAO_SUBDOMAIN` on `packages/contracts/.env`.
  - In case you want the Managing DAO to use a different subdomain than the default one (`management`):
  ```env
  MANAGINGDAO_SUBDOMAIN="root"         # would be root.my-dao.eth
  ```
- [ ] Define the the deployment wallet's private key on the `.env` file
  ```env
  ETH_KEY="your-private-key-here"          # without the 0x prefix
  ```
- [ ] Verify that the deployment wallet has sufficient funds to complete a protocol deployment.

## Deployment

When the settings above are correctly set:

```sh
cd packages/contracts               # if needed
yarn deploy --network <NETWORK>     # Replace with mainnet, polygon, sepolia, etc
```

## Post deployment

- After the script has exited, the deployment wallet will be the only one with `ROOT_PERMISSION` on your Managing DAO.
  - This allows the deployent wallet to manually install plugins on the Managing DAO.
  - After the required plugins are installed, `ROOT_PERMISSION` has to be revoked on the deployment wallet.
- Should the script encounter any issues, the deployment should be re-run.
  - The script will detect and re-use any previously deployed contracts.
- After the process completes, check out the `packages/contracts/deployed_contracts.json` file to see the deployed contract addresses.

## Other

### Rerunning the deployment script

If you need to restart the redeployment process and want Hardhat to not reuse the existing contracts:

```sh
rm -R deployments/<network-name>   # replace with the actual name
```

### Running the deployment script on a testnet

If you want to simulate an L3 deployment within a testnet (sepolia) which has official ENS support, you may want to force the deployment of a new ENS Registry.

Edit the `packages/contracts/deploy/helpers.ts` file and comment out the relevant line from `ENS_ADDRESSES` and `ENS_PUBLIC_RESOLVERS`.
