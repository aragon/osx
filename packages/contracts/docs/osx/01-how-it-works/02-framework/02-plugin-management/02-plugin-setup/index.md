---
title: The Plugin Contracts
---

## The Smart Contracts Behind Plugins

A DAO can be set up and customized by the **installation, update, and uninstallation** of plugins. Plugins are composed of two key contracts:

- **Plugin contract:** contains the plugin's implementation logic; everything needed to extend the functionality for DAOs.
- **Plugin Setup contract:** contains the instructions needed to install, update, and uninstall the plugin into the DAO. This is done through granting or revoking permissions, enabling the DAO to make use of the plugin's functionality.

![Aragon OSx Plugins](https://res.cloudinary.com/dacofvu8m/image/upload/v1683225098/Screen_Shot_2023-05-04_at_14.31.25_r0qqut.png)

How this works:

- Although a Plugin is composed `Plugin` and `PluginSetup` contracts, the Aragon OSx protocol only knows of the `PluginSetup` contract.
- Since the `PluginSetup` contract is the one in charge of installing the plugin into a DAO, it is the one also in charge of deploying the Plugin instace specific to that DAO with the parameters set by the DAO in advance. You can review how to build a `PluginSetup` contract [here](../../../../02-how-to-guides/02-plugin-development/index.md).
- The `PluginSetup` contract then interacts with the Aragon OSx framework so that installing, updating, and uninstalling a plugin to a DAO becomes very simple for the end-user.
- Publishing a Plugin into the Aragon OSx protocol is done through creating a plugin's first version. This generates a `PluginRepo` instance - registering all plugin versions. You can read more about that [here](../../../../02-how-to-guides/02-plugin-development/07-publication/index.md).
- Except for the gas costs required, plugins are completely free.

### How does this work?

The `PluginSetup` process is **security critical** because permissions are granted to third-party contracts.

Safety was our top priority in the design and we wanted to make sure that the DAO knows exactly which contracts receive which permissions before processing and making sure that the `PluginSetup` contracts developed by third parties don’t obtain elevated permissions (i.e., the `ROOT_PERMISSION_ID` permission) on the installing DAO during the setup process.

This is why we split the `PluginSetup` development in two steps:

1. **Preparation:** Defining and encoding the permissions needed to install, uninstall, or update a plugin
2. **Application:** Using the encoded functionality to actually perform the action

The `PluginSetupProcessor` is the Aragon contract in charge of using the `prepareInstallation()` function from your plugin's `PluginSetup` contract and use it to prepare the installation and apply it.

### Preparing Installation

The preparation of a `PluginSetup` contract proceeds as follows:

1. A DAO builder selects a plugin to install, uninstall, or update. Depending on the case, the `prepareInstallation`, `prepareUpdate`, or `prepareUninstallation` method in the `PluginSetup` contract is called through the `PluginSetupProcessor` (and creates a unique setup ID).

2. The `PluginSetup` contract deploys all the contracts and gathers addresses and other input arguments required for the installation/uninstallation/upgrade instructions. This can include:

   - deployment of new contracts
   - initialization of new storage variables
   - deprecating/decomissioning outdated (helper) contracts
   - governance settings or other attributes
   - ...

   Because the addresses of all associated contracts are now known, a static permission list can be emitted, hashed, and stored on-chain.

3. Once the Plugin has been prepared for installation, this encoded action is added to the `Action[]` array to be executed when a proposal passes. For a plugin to be installed, it needs to be approved by the governance mechanism of the organization.

:::info
The governance plugin can be a simple majority vote, an optimistic process or an admin governance plugin that does not involve a waiting period. It can be any governance mechanism existing within the DAO which has access to the DAO's `execute` permission.
:::

This gives the DAO members the opportunity to check which permissions the `PluginSetup` contract request before granting/revoking them.

Plugin setup proposals must be carefully examined as they can be a potential security risk if the `PluginSetup` contract comes from an untrusted source. To learn more visit the [Security](./01-security-risk-mitigation.md) section.

<!-- TODO: add a costs sections

Optionally, the proposer can also request refunds for the gas spent for the preparation of the plugin in the proposal.
-->

### Applying the action

After this initial preparation transaction, all contracts and addresses related to the plugin, as well as their permissions, are known and the DAO can decide if the proposal should be accepted or denied.

Once the proposal has passed, the actions specified in the `Action[]` array get executed and the prepared `PluginSetup` is used to install the plugin into the DAO.

This is processed as follows:

1. The DAO temporarily grants the `ROOT_PERMISSION_ID` permission to the `PluginSetupProcessor`. This is needed so that the processor can modify the DAO's permissions settings to set up the plugin.
2. This `Action` calls the `processInstallation`, `processUpdate`, or `processUninstallation` method in the `PluginSetupProcessor`, containing the permissions list as argument. The permission hash is compared with the stored hash to make sure that the permission didn’t change.
   In addition to the above, the update process also upgrades the logic contract to which the proxy points too.
3. If the hash is valid, the list is processed and `PluginSetupProcessor` conducts the requested sequence of `grant`, `grantWithCondition` and `revoke` calls on the owning DAO.
   Finally, the `PluginSetupProcessor` asks the DAO to revoke the `ROOT_PERMISSION_ID` permission from itself.

:::info
The two-step setup procedure in Aragon OSx is not limited to the setup of only one plugin — you can **setup multiple plugins at once** by first preparing them in a single proposal and then processing the entire setup sequence in one transaction. This is powerful and allows you to **transform your entire DAO in one proposal**, for example, to install a new governance plugin (e.g., a gasless ZK-vote) and finance plugin (e.g., to stream loans to your members), while uninstalling your old ERC20 token vote in one go.
:::

In the next sections, you will learn about how plugins are curated on Aragon's repository.

<div class="center-column">

**a.** ![Schematic depiction of the plugin installation process.](plugin-installation.drawio.svg)
**b.** ![Schematic depiction of the plugin update process.](plugin-update.drawio.svg)
**c.** ![Schematic depiction of the plugin uninstallation process.](plugin-uninstallation.drawio.svg)

<p class="caption">
   Simplified overview of the two-transaction plugin <b>a.</b> installation, <b>b.</b> update, and <b>c.</b> uninstallation process with the involved contracts as rounded rectangles, interactions between them as arrows, and relations as dashed lines. The first and second transaction are distinguished by numbering as well as solid and dotted lines, respectively.
</p>

</div>
