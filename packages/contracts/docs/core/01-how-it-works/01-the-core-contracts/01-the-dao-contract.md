---
title: The DAO Contract
---

## The Identity and Basis of Your Organization

In this section, you will learn about the core functionality of every aragonOS DAO.

The `DAO` contract is the identity and basis of your organization. It is the address carrying the DAO’s ENS name, metadata, and holding the funds. Furthermore, it has **six base functionalities** being commonly found in other DAO frameworks in the ecosystem.

### 1. Execution of Arbitrary Actions

The most important and basic functionality of your DAO is the **execution of arbitrary actions**, which allows you to interact with the rest of the world, i.e., calling methods in other contracts services sending assets to other addresses.
In our framework, actions are represented by a solidity struct:

```solidity title="contracts/core/IDAO.sol"
struct Action {
  address to; // The address to call
  uint256 value; // The value to be sent with the call (for example ETH if on mainnet)
  bytes data; // The `bytes4` function signature and arguments
}

```

Actions are typically scheduled in a proposal in a governance [plugin customizing your DAO](03-plugins.md) can be calls to external contracts, plugins, or the aragonOS DAO framework infrastructure, for example, to [setup a plugin](../02-the-dao-framework/02-plugin-repository/04-plugin-setup.md).

Multiple `Action` structs can be put into one `Action[]` array and executed in a single transaction via the `execute` function.

```solidity title="contracts/core/DAO.sol"
/// @notice Executes a list of actions.
/// @dev Runs a loop through the array of actions and executes them one by one. If one action fails, all will be reverted.
/// @param callId The id of the call. The definition of the value of `callId` is up to the calling contract and can be used, e.g., as a nonce.
/// @param _actions The array of actions.
/// @return bytes[] The array of results obtained from the executed actions in `bytes`.
function execute(uint256 callId, Action[] memory _actions)
  external
  override
  auth(address(this), EXECUTE_PERMISSION_ID)
  returns (bytes[] memory)
{
  bytes[] memory execResults = new bytes[](_actions.length);

  for (uint256 i = 0; i < _actions.length; i++) {
    (bool success, bytes memory response) = _actions[i].to.call{
      value: _actions[i].value
    }(_actions[i].data);
    if (!success) revert ActionFailed();
    execResults[i] = response;
  }

  emit Executed(msg.sender, callId, _actions, execResults);

  return execResults;
}

```

### 2. Asset Management

The DAO provides basic **asset management** functionality by allowing us to `deposit`, `withdraw`, and keep track of certain tokens in the DAO treasury, such as:

- [ERC-20 (Token Standard)](https://eips.ethereum.org/EIPS/eip-20)
- [ERC-721 (NFT Standard)](https://eips.ethereum.org/EIPS/eip-721) _(coming soon)_
- [ERC-1155 (Multi Token Standard)](https://eips.ethereum.org/EIPS/eip-1155) _(coming soon)_

You can add more advanced asset management and finance functionalities to your DAO in the form of [plugins](03-plugins.md).

### 3. Upgradeability

Your DAO contract has the ability to be upgraded to a newer version (see [Upgrade your DAO](../../02-how-to-guides/02-dao-upgrading/index.md)) if a new version of aragonOS is released in the future. These upgrades allow your DAO to smoothly transition to a new protocol version unlocking new features to your DAO.

### 4. Callback Handling

:::note
Work in Progress.
:::

<!--Explain Callback Handler. Provide a use case as an example (e.g. NFT standard and the `event TokenReceived`). -->

### 5. Signature Validation

:::note
Work in Progress.
:::
Your DAO contract has the ability to validate signatures according to [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271).

<!--Explain signature validation. Provide a use case as an example. -->

### 6. Permission Management

Lastly, it is essential that only the right entities (e.g., the DAO itself or trusted addresses) have permission to use the above-mentioned functionalities.

This is why aragonOS DAOs contain a flexible and battle-tested **permission manager** being able to assign permissions for the above functionalities to specific addresses.

Although possible, the permissions to withdraw assets, execute arbitrary actions or upgrade the DAO should not be given to externally owned accounts (EOA) as this poses a security risk to the organization if the account is compromised or acts adverserial.

Instead, the permissions for the above-mentioned functionalities are better restricted to the `DAO` contract itself and triggered through governance [plugins](03-plugins.md) that you can install on your DAO.

In the next section, we will dive deeper into the DAOs permission manager.
