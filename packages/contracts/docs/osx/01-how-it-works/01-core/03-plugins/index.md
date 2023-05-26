---
title: Plugins
---

## Customizing your DAO

To add features beyond the base functionality available, you can customize your Aragon OSx DAO by installing a wide variety of plugins.

Plugins can be related to:

- **Governance:** provides the DAO with different **decision-making** mechanisms such as token or address-based majority voting, conviction voting, optimistic governance, or direct execution from an admin address. They are characterized by requiring the `EXECUTE_PERMISSION_ID` permission on the DAO.
  Advanced governance architectures are possible by having multiple governance plugins simultaneously.

- **Asset Management:** allows the DAO to manage its **treasury** or use it to invest (e.g., in lending, staking, or NFT mints).

- **Membership:** determines **who** will be a part of the DAO and what role they have. This can mean minting governance tokens like [ERC-20](https://eips.ethereum.org/EIPS/eip-20), NFTs, or any other token standard. Typically, membership-related plugins grant permissions based on token ownership or maintenance of a curated list of addresses.

- And **anything** else that comes to mind!

## Understanding Plugins

Whenever a DAO installs a plugin, an instance of that plugin's base template is deployed using the configuration parameters defined by the DAO. For example, you may want to use a specific token for your DAO's voting process, which means you have to determine this within your plugin's configuration parameters.

Each instance of a plugin is installed to a DAO through the granting of permissions.

:::info
Lern more about the different [plugin types](../../../02-how-to-guides/02-plugin-development/02-plugin-types.md) in our How-to guide.
:::

This raises questions on how the DAO manages plugins and who actually owns plugins.

### How does the DAO Manage a Plugin?

A DAO manages plugins and interactions between them. In more detail, its permission manager:

- enables the plugin installation process through the granting and revoking of permissions for the DAO
- authorizes calls to plugin functions carrying the `auth` modifier
- authorizes calls to DAO functions, for example, the `execute` function allowing for acting as the DAO

by checking if the caller `hasPermission`.

<div class="center-column">

![Schematic depiction of the interaction between the DAO, the PermissionManager, and a Plugin contract.](../dao-plugin.drawio.svg)

<p class="caption">
  An examplary DAO setup showing interactions between the three core contract pieces triggered by different user groups: The <code>DAO</code> contract in blue containing the <code>PermissionManager</code> in red, respectively, as well as two <code>Plugin</code> contracts in green.
  Function calls are visualized as black arrows and require permission checks (red, dashed arrow). In this example, the permission manager determines whether the token voting plugin can execute actions on the DAO, a member can change its settings, or if a DeFi-related plugin is allowed to invest in a certain, external contract.
</p>

</div>

Whereas deployed plugin instances belong to the DAO, the developer of the original plugin implementation owns the implementation and setup contract of the plugin. The plugin developer is the maintainer of an Aragon OSx [plugin repo](../../02-framework/02-plugin-management/01-plugin-repo/index.md). Finally, the Aragon OSx protocol manages the registry in which the plugin repositories are listed, which is required to install a plugin using the Aragon OSx framework infrastructure to your DAO.
