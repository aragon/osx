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

In the next section, we will learn more about plugins, how they work, and who owns and manages them.
