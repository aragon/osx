# ZkSync

ZkSync uses a zkEVM and so has different requirements.

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

1. Check that I correctly did skip tests as your suggestion/help.

- I've reviewed and made a few small changes but otherwise they look good.
- The tests log immediately, so have changed the language a bit

2. In tokenVotingSetupZkSync contract, you will notice what I have done and why I got setUpgradePermissions and so on. If we can find a way to write this contract simpler, would be good.

- It looks sensible. I think we should do a thorough review in the morning when we both have fresh eyes.

- I think we need to find a way to revoke the UPGRADE permission inside the uninstallation script

- I removed the permissionIndex from the test. This should always resolve to the final permission in the array so we can just use the permissions array length:
  - If we have a governance ERC20, then we lengthen the array to 4
  - We always add +1 to the permissions array if the upgrade permission is needed

3. There are two tests that fail in dao.ts due to insufficient gas on zksync. Either skip it if you feel confident or on the weekends, I will also learn what the fuck they are.

- Yep we need to look at these gas tests. On Monday I wasted ages on these and I'm honestly no closer to understanding wtf is going on. That being said I have said several times I think the gas logic of ZkSync doesn't make this a vulnerability.

4. Take a look at GovernanceERC20Upgradeable and GovernanceWrappedERC20Upgradeable. What struck me is that the contracts they inherit from(i.e GovernanceERC20 and GovernanceWrappedERC20), they don’t have gaps which means that if we in the future decide to add new variable in GovernanceERC20Upgradeable and then in GovernanceERC20, we will mess up the storage. But let’s go with how it is. I really don’t care since this case won’t happen, but I need you to exactly understand what I mean so you’re aware of that too.

- Good spot. So just reiterating:
  - GovE20Up <- GovE20 (wrapped has similar chain)
  - We can add new storage vars to the upgradeable version but not to the GovE20, because we have no gap, so it will start writing to storage slots inside GovERC20Up
- Would a workaround not be to first declare a `__gap` of reserved storage slots on GovERC20upgradeable THEN we add new storage variables (if needed)
- We would need to be careful this doesn't linearize unexpectedly and write to UUPSUpgradeable Storage.
- Why do you say "this case won't happen"?

5. In hardhat-deploy script, we shouldn’t deploy Admin plugin if network is zksync.

- I added a skip function to the admin deploy steps, you can take a look.

6. Play with running tests on zksync and hardhat to see how it looks and if I missed anything or not. We can deal with deployment in the next days. Maybe you come across that skipped message sometimes prints ‘f’. You can change it as you see fit.

- I removed the `f` tests
- I ran into some issues with matchers not firing, I brought these across into our testing lib
- Ran the whole test suite on 1.4.1, lgtm other than existing comments

7.  On hardhat-deploy script, we should deploy TokenVotingSetupZksync and also Governance contracts as upgradeable versions.

8.  Make psp upgradeable(create PSPZKSYNC), and deploy it on zksync network in hardhat-deploy script. Add some tests to test whether it can be upgraded.
9.  Maybe we should write tests to check whether my GovernanceERC20Upgradeable and GovernanceWrappedERC20Upgradeable can be upgraded.
10. I skipped TokenFactory tests completely on all networks as we’re not using it at all(do we use it ?)

11. To run tests on zksync, in hardhat.config.ts, you need to comment some stuff and to run tests on hardhat, you need to uncomment and comment other stuff. I asked about this and hardhat team said to use multiple configuration files. Just know that this is required to comment/uncomment.

- I made a quick attempt to add `hardhat.config-zk.ts`
- I then used this in `yarn hardhat --config hardhat.config-zk.ts test --network zkLocalTestnet` but I got some weird errors related to the wrapper not being instantiated
- We can come back to this, but I don't think it's essential just yet
