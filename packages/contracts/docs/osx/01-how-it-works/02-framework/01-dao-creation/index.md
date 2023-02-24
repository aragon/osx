---
title: DAO Creation
---

## The DAO Creation Process

Two framework contracts manage the `DAO` contract creation process:

- The [`DAOFactory`](../../../03-reference-guide/framework/dao/DAOFactory.md)
- The [`DAORegistry`](../../../03-reference-guide/framework/dao/DAORegistry.md).

<!-- Add subgraphic from the framework overview main graphic-->

### `DAOFactory`

The `DAOFactory` creates and sets up a `DAO` for you in four steps with the `createDao` function. The function requires the `DAOSettings` including

- The trusted forwarder address for future [ERC-2771 (Meta Transaction)](https://eips.ethereum.org/EIPS/eip-2771) compatibility that is set to `address(0)` for now
- The ENS name (to be registered under the `dao.eth` domain)
- The [ERC-4824 (Common Interfaces for DAOs)](https://eips.ethereum.org/EIPS/eip-4824) `daoURI`
- Optional metadata

as well as an array of `PluginSettings` containing `PluginSetup` contract references and respective setup data for the initial set of plugins to be installed on the DAO.

The `DAOFactory` create the `DAO` in four steps and interacts with the `DAORegistry` and being also part of the Aragon OSx framework:

1. Creates a new DAO by deploying an [ERC-1967](https://eips.ethereum.org/EIPS/eip-1967) proxy pointing to the latest Aragon OSx `DAO` impelementation and becomes the initial owner.

2. Registers the new contract in the [`DAORegistry`](#daoregistry).

3. Installs the plugins using the `PluginSetupProcessor` (see also the section about [the plugin setup process](../02-plugin-management/02-plugin-setup/index.md).

4. Sets the [native permissions](../../01-core/02-permissions/index.md/#permissions-native-to-the-dao-contract) of the `DAO` and revokes its own ownership.

For more details visit the [`DAOFactory` reference guide entry](../../../03-reference-guide/framework/dao/DAOFactory.md).

### `DAORegistry`

The `DAORegistry` is used by the `DAOFactory` and contains the `register` function

```solidity title="@aragon/framework/dao/DAORegistry.sol"
function register(
  IDAO dao,
  address creator,
  string calldata subdomain
) external auth(REGISTER_DAO_PERMISSION_ID);
```

requiring the `REGISTER_DAO_PERMISSION_ID` permission currently held only by the `DAOFactory`.

If the requested ENS `subdomain` name [is valid](../03-ens-names.md) and not taken, the `DAORegistry` registers the subdomain and adds the `DAO` contract address to the `DAORegistry`.
If the registration was successful, the DAO name, contract and creator addresses are emitted in an event.

For more details visit the [`DAORegistry` reference guide entry](../../../03-reference-guide/framework/dao/DAORegistry.md).
