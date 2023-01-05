---
title: DAO Creation
---

:::note
Work in Progress.
:::

## Creating Your DAO and Choosing Plugins

Creating a DAO with a custom set of plugins on the frontend is simple.  
After picking an available subdomain name on the `dao.eth` domain, we select the plugins to be installed and configure them. The plugin contracts then gets deployed and prepared via the `PluginSetupProcessor` [(learn more about the setup process here)](../02-the-dao-framework/02-plugin-repository/04-plugin-setup.md).
After confirmation, the `DAOFactory` contract creates the `DAO`.

For this **creation process**, the `DAOFactory` executes multiple steps:

The `DAOFactory` contract does the following steps:

1. Call the `createProxy(address daoBase)` function, where `daoBase` is the current aragonOS (`UUPSUpgradeable`) `DAO` implementation contract

2. Call the initialize function

   ```solidity title =contracts/core/DAO.sol
   function initialize(
     bytes calldata _metadata,
     address _initialOwner,
     address _trustedForwarder
   ) external initializer {}

   ```

   function with `_initialOwner = address(this)`. As a result, the `DAOfactory` now has the `ROOT_PERMISSION_ID` permission on the newly created DAO.

3. Call the `registerDao(string daoName, address daoAddress)` function in the `DAORegistry` contract

4. Use the `ROOT_PERMISSION_ID` permission to

   1. `grant` itself the `APPLY_INSTALLATION_PERMISSION_ID` permission
   2. `grant` the Aragon `PluginSetupProcessor` the `ROOT_PERMISSION_ID` permission to give permissions to the plugins being installed

5. Use the `APPLY_INSTALLATION_PERMISSION_ID` permission to call the `PluginSetupProcessor` to install the requested plugins (see [The Plugin Setup Process](../02-the-dao-framework/02-plugin-repository/04-plugin-setup.md))
   :::note
   The UI will make sure that the creator has selected at least one governance plugin having `EXECUTE_PERMISSION_ID` permission on the DAO.
   :::

6. Use the `ROOT_PERMISSION_ID` permission to

   1. `grant` all non-temporary permissions to the created DAO.

   2. `grant` the `ROOT_PERMISSION_ID` permission to the intended owner specified by the DAO creator

   3. `revoke` the `APPLY_INSTALLATION_PERMISSION_ID` permission from itself

   4. `revoke` the `ROOT_PERMISSION_ID` permission from itself
