# Deployment Checklist

This checklist is seen as a guide to deploy the contracts to a new chain.

## Pre-Deployment

- [ ] Run `yarn` in the repository root to install the dependencies.
- [ ] Run `yarn build` in `packages/contracts` to make sure the contracts compile.
- [ ] Run `yarn test` in `packages/contracts` to make sure the contract tests succeed.
  - In order to run the tests on localhost, add the following in the packages/contracts/.env
    ```
    HARDHAT_DAO_ENS_DOMAIN=testdao.eth
    HARDHAT_PLUGIN_ENS_DOMAIN=testpluginrepo.eth
    MANAGINGDAO_SUBDOMAIN=test
    ```
- [ ] Verify that the deployers wallet has enough funds.
- [ ] Go to `packages/contracts/networks.json` and add your custom network to which you want to deploy to.

  If your chain doesn’t support contract verification:

  - Make sure that whatever custom network you add into this file, its `deploy` key looks exactly: <br>
    `"deploy": ["./deploy/new"]`

  If your chain supports contract verification:

  - set `deploy` key such as: <br>
    `"deploy": ["./deploy/new", "./deploy/verification"]` .
    Not only that, you will need to provide the API_KEY or rpc url for contract verification, depending on the chain. Follow the guide https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify in such case.

- [ ] Management DAO is the dao that will govern the protocol/framework and its rules. So go to `packages/contracts/deploy/management-dao-metadata.json` and update its values as you wish. This is deployed to the IPFS and its cid is stored in the managing dao so users can get information about what this managing dao does.
- [ ] Ensure to add `ETH_KEY` in the `.env` which is your private key that will be used to deploy all the contracts. Example:
  ```jsx
  ETH_KEY = YOUR_PRIVATE_KEY; // without `0x` prefix
  ```
- [ ] Our contracts use ENS, so it’s important that you safely add the following ENS names in the packages/contracts/.env file. <br>

  - `NETWORK_DAO_ENS_DOMAIN`
  - `NETWORK_PLUGIN_ENS_DOMAIN`

    NOTE that `NETWORK` must be replaced to the network name you’re trying to deploy to.
    Example would be:

    ```
    SEPOLIA_DAO_ENS_DOMAIN="testdao.eth"
    SEPOLIA_PLUGIN_ENS_DOMAIN="testplugin.eth"
    ```

    Make sure domains end up with domain suffix, such as .eth or .com or any other suffix that ENS supports).

  - If the chain you’re deploying to already has official ENS registry, then follow the below rules. <br>
    - **IMPORTANT 1: The ENS domain(ex: testdao.eth and testplugin.eth**) must be owned by the deployer address, otherwise the script will fail miserably, so make sure that whatever domains you add, deployer owns those before running the deploy script. <br>
    - **IMPORTANT 2:** Note that if you created the domains through ENS App website, that means they will be owned by a ENS wrapper which would also cause our script to fail, so make sure to go to ens app and click `unwrap` for each of these domains. `unwrap` can be found here - [https://app.ens.domains/morpheusplugin.eth?tab=more](https://app.ens.domains/morpheusplugin3.eth?tab=more)
  - If the chain you’re deploying to doesn’t have the ENS registry, then: <br>
    - The script will deploy ENS Registry and Resolver contracts. In this scenario, the domains don’t need to be owned by deployer and the domain and also .eth domain itself both get transferred to the managing dao. I.e., if you set a domain such as “test.eth”, the managing dao will become the owner of both “test.eth” and “.eth”.
      Every dao and plugin-repos(not plugins, but plugin-repos) that will be deployed by developers and users through your framework will automatically get ENS record such as:
      daos will get: `dao_name.testdao.eth => daoAddress`
      plugin-repos will get: `plugin_repo_name.testplugin.eth => pluginRepoAddress`
      So basically, users’ domains are registered under your main domains.

- [ ] The last thing is to add `MANAGINGDAO_SUBDOMAIN` in the packages/contracts/.env file as well. This will be the ENS name that your managing dao will get. Make sure to NOT add any suffix. <br>
      Ex: your managing dao would get: `management.testdao.eth` ens name.

```jsx
MANAGINGDAO_SUBDOMAIN = management;
```

---

Once all details are correctly set:

run `yarn deploy --network NETWORK` in `packages/contracts` and replace `NETWORK` with the correct network name (e.g. for mainnet it is `yarn deploy --network mainnet`).

- NOTE that after the script is run and finished, deployer will be the only one, having `EXECUTE_PERMISSION` on your managing dao. This allows you to deploy/install plugin separately, but note that the same deployer's private key must be used for the plugin deployment/installation. After the plugin is installed, it's important to revoke `EXECUTE_PERMISSION` on the deployer.
- In case the script fails in the middle, try to rerun it again, in which case, it won’t start deploying contracts from scratch, but re-use already deployed contracts.
- If everything worked smoothly, all the deployed contracts' addresses can be found in the `packages/contracts/deployed_contracts.json`.
