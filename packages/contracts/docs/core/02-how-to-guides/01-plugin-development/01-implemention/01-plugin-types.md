---
title: Plugin Types
---

## Choosing the Base Contract for Your Plugin

In this section, we will learn about the interfaces or base contracts you can inherit from when developing a plugin (this is, however, not mandatory).

Depending on the use-case of your plugin, you may need it to be:

- upgradeable or non-upgradeable
- deployed by a specific deployment method
- compatible with meta transactions

:::caution
Upgradeable plugin contracts (such as `PluginUpgradeable`, `PluginUUPSUpgradeable` implementations) must reserve empty space by defining a [storage gap](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps). If this is not done properly and/or variables are rearranged in the upgrade, the storage can become corrupted rendering it inaccessible and resulting in the loss of funds.
:::

### Upgradeability & Deployment

Upgradebility and the deployment method of a plugin contract go hand in hand.

The motivation behind upgrading smart contracts is nicely summarized by OpenZepplin:

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

Depending on your upgradeability requirements and the deployment method you choose, you can also greatly reduce the gas costs to distribute your plugin.
However, the upgradeability and deployment method can introduce caveats during [the plugin setup](../../../../core/01-how-it-works/02-framework/02-plugin-management/02-plugin-setup/index.md), especially when updating from an older version to a new one.

The following table presents an overview of the different deployment methods with each of their benefits and drawbacks:

| Deployment Method     | `new` Instantiation                              | Minimal Proxy (Clones)                            | Transparent Proxy                                | UUPS Proxy                                       |
| --------------------- | ------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| upgradability         | <span class="table-cell-negative">no</span>      | <span class="table-cell-negative">no</span>       | <span class="table-cell-positive">yes</span>     | <span class="table-cell-positive">yes</span>     |
| gas costs             | <span class="table-cell-negative">high</span>    | <span class="table-cell-positive">very low</span> | <span class="table-cell-neutral">moderate</span> | <span class="table-cell-positive">low</span>     |
| plugin installation   | <span class="table-cell-positive">easy</span>    | <span class="table-cell-positive">easy</span>     | <span class="table-cell-neutral">moderate</span> | <span class="table-cell-neutral">moderate</span> |
| plugin uninstallation | <span class="table-cell-positive">easy</span>    | <span class="table-cell-positive">easy</span>     | <span class="table-cell-positive">easy</span>    | <span class="table-cell-positive">easy</span>    |
| plugin updating       | <span class="table-cell-negative">limited</span> | <span class="table-cell-negative">limited</span>  | <span class="table-cell-positive">easy</span>    | <span class="table-cell-positive">easy</span>    |

Accordingly, we recommend the UUPS proxy method for developing easily updatable Aragon Plugins and minimal clones for those, where the availability of the storage after the update is secondary / not needed.

To help you with developing and deploying your plugin within the Aragon infrastructure, we provide the following implementation and setup contract base classes that you can inherit from:

- `Plugin` (intended for instantiation via `new`)
- `PluginClones` (intended for the deployment via the [minimal clones pattern (ERC-1167)](https://eips.ethereum.org/EIPS/eip-1167))
- `PluginUUPSUpgradeable` (intended for deployment via the [UUPS pattern (ERC-1822)](https://eips.ethereum.org/EIPS/eip-1822))

#### Caveats of non-upgradeable Plugins

Aragon plugins using non-upgradeable smart contracts can be cheap to deploy (i.e., using clones) but are **limited when it comes to updating**.

Updating, in distinction from upgrading, will call aragonOSx' internal process for switching from an older plugin version to a newer one.

To switch from an older version of a non-upgradeable contract to a newer one, the underlying contract has to be replaced. In consequence, the state of the older version is not available in the new version anymore, unless it is migrated or has been made publicly accessible in the old version through getter functions.

### Meta Transaction Compatibility

:::info
The meta-transaction compatibility of DAOs, plugins, and infrastructure in aragonOSx is currently worked on and not finally decided.
:::

Another useful trait of a contract is the possibility to allow users to send gasless transactions, also known as meta transactions.

This works by signing a transaction and letting a relay service take care of sending and paying the gas for the transaction.
As a consequence, `msg.sender` and `msg.data` parameters are not referencing the correct context anymore. To be compatible with meta transactions, all our contracts use internal `_msgSender()` and `_msgData()` functions.

<!--TODO: Adapt
Beyond that, to enable plugins to operate with meta transactions, we provide the `MetaTxCompatible` contract.
-->
