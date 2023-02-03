---
title: The Core Contracts
---

## The Contracts Constituting Your DAO

In a nutshell, your aragonOSx DAO consists of three pieces:

1. **The DAO contract:** The DAO contract is where the **core functionality** of the protocol lies. It is in charge of:
   - Representing the identity of the DAO carrying an ENS name, and pointing to a logo, a description, and other metadata,
   - Managing the DAOs assets, and
   - Interacting with other contracts.
2. **The Permission Manager:** The permission manager is part of the DAO contract and the center of our protocol architecture. It **manages and governs the interactions between the DAO and other addresses**. These addresses can be wallets (EOAs) or smart contracts, such as other (sub-)DAOs, multi-sig wallets or Aragon plugins.
3. **Plugins:** Any custom functionality can be added or removed through plugins, allowing you to **fully customize your DAO**. We can imagine these to be governance plugins for collective decision-making, such as token voting or one-person, one-vote, or asset management such as the streaming of tokens.

<div class="center-column">

![Schematic depiction of the interaction between the DAO, the PermissionManager, and a Plugin contract.](dao-plugin.drawio.svg)

<p class="caption"> 
  Overview of the three core contract pieces and their interactions: The `DAO` and `PermissionManager` contract in blue and red, respectively, as well as a `Plugin` contract in green conducting a function call (black arrow) on the DAO contract that require permission checks (red, dashed arrow).
</p>

</div>

The underlying smart contracts constitute **the core contracts** of the aragonOSx DAO framework.

In the upcoming sections you will learn about each of them in more depth.

- [The Identity and Basis of your Organization](./01-dao/index.md)
- [Managing and Governing your DAO](./02-permissions/index.md)
- [Customizing your DAO](./03-plugins/index.md)
