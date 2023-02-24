---
title: Plugin Types
---

## Choosing the Base Contract for Your Plugin

In this section, we will learn about the interfaces or base contracts you can inherit from when developing a plugin (this is, however, not mandatory).

Depending on the use-case of your plugin, you may need it to be:

- upgradeable or non-upgradeable
- deployed by a specific deployment method
- compatible with meta transactions

<!-- Remove this? As long this is the concrete implementation and developers don't inherit from their own contracts, they don't need to care about storage gaps.
:::caution
Upgradeable plugin contracts (i.e., `PluginUUPSUpgradeable` implementations) must reserve empty space by defining a [storage gap](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps). If this is not done properly and/or variables are rearranged in the upgrade, the storage can become corrupted rendering it inaccessible and resulting in the loss of funds.
:::
-->

### Upgradeability & Deployment

Upgradeability and the deployment method of a plugin contract go hand in hand. The motivation behind upgrading smart contracts is nicely summarized by OpenZepplin:

> Smart contracts in Ethereum are immutable by default. Once you create them there is no way to alter them, effectively acting as an unbreakable contract among participants.
>
> However, for some scenarios, it is desirable to be able to modify them [...]
>
> - to fix a bug [...],
> - to add additional features, or simply to
> - change the rules enforced by it.
>
> Here’s what you’d need to do to fix a bug in a contract you cannot upgrade:
>
> 1. Deploy a new version of the contract
> 2. Manually migrate all state from the old one contract to the new one (which can be very expensive in terms of gas fees!)
> 3. Update all contracts that interacted with the old contract to use the address of the new one
> 4. Reach out to all your users and convince them to start using the new deployment (and handle both contracts being used simultaneously, as users are slow to migrate
>
> _source: [OpenZepplin: What's in an upgrade](https://docs.openzeppelin.com/learn/upgrading-smart-contracts#whats-in-an-upgrade)_

With upgradeable smart contracts, you can modify their code while keep using or even extending the storage (see the guide [Writing Upgradeable Contracts](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable) by OpenZepplin).

To enable upgradeable smart contracts (as well as cheap contract clones), the proxy pattern is used.

Depending on your upgradeability requirements and the deployment method you choose, you can also greatly reduce the gas costs to distribute your plugin. However, the upgradeability and deployment method can introduce caveats during [the plugin setup](../../01-how-it-works/02-framework/02-plugin-management/02-plugin-setup/index.md), especially when updating from an older version to a new one.

The following table compares the different deployment methods with their benefits and drawbacks:

|               | `new` Instantiation                           | Minimal Proxy (Clones)                            | Transparent Proxy                                | UUPS Proxy                                    |
| ------------- | --------------------------------------------- | ------------------------------------------------- | ------------------------------------------------ | --------------------------------------------- |
| upgradability | <span class="table-cell-negative">no</span>   | <span class="table-cell-negative">no</span>       | <span class="table-cell-positive">yes</span>     | <span class="table-cell-positive">yes</span>  |
| gas costs     | <span class="table-cell-negative">high</span> | <span class="table-cell-positive">very low</span> | <span class="table-cell-neutral">moderate</span> | <span class="table-cell-positive">low</span>  |
| difficulty    | <span class="table-cell-positive">low</span>  | <span class="table-cell-positive">low</span>      | <span class="table-cell-negative">high</span>    | <span class="table-cell-negative">high</span> |

Accordingly, we recommend to use [minimal proxies (ERC-1167)](https://eips.ethereum.org/EIPS/eip-1167) for non-upgradeable and [UUPS proxies (1822)](https://eips.ethereum.org/EIPS/eip-1822) for upgradeable plugin.
To help you with developing and deploying your plugin within the Aragon infrastructure, we provide the following implementation that you can inherit from:

- `Plugin` for instantiation via `new`
- `PluginClones` for [minimal proxy pattern (ERC-1167)](https://eips.ethereum.org/EIPS/eip-1167) deployment
- `PluginUUPSUpgradeable` for [UUPS pattern (ERC-1822)](https://eips.ethereum.org/EIPS/eip-1822) deployment

#### Caveats of non-upgradeable Plugins

Aragon plugins using the non-upgradeable smart contracts bases (`Plugin`, `PluginCloneable`) can be cheap to deploy (i.e., using clones) but **cannot be updated**.

Updating, in distinction from upgrading, will call Aragon OSx' internal process for switching from an older plugin version to a newer one.

To switch from an older version of a non-upgradeable contract to a newer one, the underlying contract has to be replaced. In consequence, the state of the older version is not available in the new version anymore, unless it is migrated or has been made publicly accessible in the old version through getter functions.
