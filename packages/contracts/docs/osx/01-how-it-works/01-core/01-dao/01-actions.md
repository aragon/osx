---
title: Advanced Action Execution
---

## A Deep Dive into Actions and Execution

The DAO's `execute` function is part of the `DAO.sol` contract and has the following function header:

```solidity title="@aragon/osx/core/dao/DAO.sol"
function execute(
        bytes32 _callId,
        Action[] calldata _actions,
        uint256 _allowFailureMap
    )
        external
        override
        auth(address(this), EXECUTE_PERMISSION_ID)
        returns (bytes[] memory execResults, uint256 failureMap)
```

It offers two features that we will dive into in this article:

1. Execution of an array of arbitrary `Action` items.
2. Allowing failure of individual actions without reverting the entire transaction.

### Actions

In our framework, actions are represented by a solidity struct:

```solidity title="@aragon/osx/core/dao/IDAO.sol"
/// @notice The action struct to be consumed by the DAO's `execute` function resulting in an external call.
/// @param to The address to call.
/// @param value The native token value to be sent with the call.
/// @param data The bytes-encoded function selector and calldata for the call.
struct Action {
  address to;
  uint256 value;
  bytes data;
}
```

Actions can be

- function calls to the DAO itself (e.g., to upgrade the DAO contract to a newer version of Aragon OSx)
- function calls to other contracts, such as

  - external services (e.g. Uniswap, Compound, etc.)
  - Aragon OSx plugins (e.g., the DAO can be a member of a multisig installed in another DAO),
  - Aragon OSx protocol infrastructure (e.g., to [setup a plugin](../../02-framework/02-plugin-management/02-plugin-setup/index.md))

- transfers of native tokens

#### Example: Calling the wETH Contract

We have an Aragon DAO deployed on the Goerli testnet. Now, we want to wrap `0.1 ETH` from the DAO treasury into `wETH` by depositing it into the [Goerli WETH contract](https://goerli.etherscan.io/token/0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6#writeContract) deployed on the address `0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6`. The corresponding `Action` and `execute` function call look as follows:

```solidity

IDAO.Action[] memory actions = new IDAO.Action[](1);

actions[0] = IDAO.Action({
  to: address(0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6), //         The address of the WETH contract on Goerli
  value: 0.1 ether, //                                                The Goerli ETH value to be sent with the function call
  data: abi.encodeWithSelector(bytes4(keccak256('deposit()', []))) // The calldata
});

dao().execute({_callId: '', _actions: actions, _allowFailureMap: 0});

```

For the `execute` call to work, the caller must have the required [`EXECUTE_PERMISSION_ID` permission](../02-permissions/index.md) on the DAO contract.

### The Action Array

The `Action[] calldata _actions` input argument allows you to execute an array of up to 256 `Action` items in a single transaction within the gas limitations of the Ethereum virtual machine (EVM).
This is important so that several calls can be executed in a strict order within a single transaction.

Imagine a DAO is currently governed by a multisig (it has the `Multisig` plugin installed) and wants to transition the DAO governance to token voting.
To achieve this, one of the Multisig members creates a proposal in the plugin proposing to

1. install the `TokenVoting` plugin
2. uninstall the `Multisig` plugin

If enough multisig signers approve and the proposals passes, the action array can be executed and the transition happens.

Here, it is important that the two actions happen in the specified order and both are required to succeed.
Otherwise, if the first action would fail or the second one would happen beforehand, the DAO could end up in a state without having a governance plugin enabled.

Accordingly and by default, none of the atomic actions in the action array is allowed to revert. Otherwise, the entire action array is reverted.

### Allowing For Failure

In some scenarios, it makes sense to relax this requirement and allow specific actions in the array to revert.
Imagine a DAO wants to buy two NFTs A and B with DAI tokens. A proposal is scheduled in a governance plugin to

1. set the DAI allowance to `125`
2. try to buy NFT A for `100` DAI
3. try to buy NFT B for `125` DAI
4. set the DAI allowance to `0`

Once the proposal has passed, it might be that the NFT A or B was already bought by someone else so that action 2 or 3 would revert.
However, if the other NFT is still available, the DAO might still want to make at least the second trade.
Either way, the DAO needs to first approve `125` DAO tokens before the trade and wants to set it back to `0` after the potential trades have happened for security reasons.

#### The `allowFailureMap` Input Argument

This optionality can be achieved with the allow-failure feature available in the DAO's `execute` function.
To specify that failure is allowed for the actions 2 and 3, we provide the following `_allowFailureMap`:

```solidity
uint256 _allowFailureMap = 6;
```

and explain why in the following:

In binary representation a `uint256` value is a number with 256 digits that can be 0 or 1. In this representation, the value of `uint256(6)` translates into

```solidity
... 0 0 0 1 1 0 // the value 6 in binary representation
... 5 4 3 2 1 0 // the indices of the action array items that are allowed to fail.
```

where we omitted 250 more leading zeros. This binary value encodes a map to be read from right to left encoding the indices of the action array that are allowed to revert.
Accordingly, the second and third array item (with the indices 1 and 2) are allowed to fail.
If we want that every atomic succeeds, we specify a `allowFailureMap` value of `0`.

#### The `failureMap` Output Argument

In analogy and after an action array with a provided allow-failure map was executed successfully in the DAO, the `execute` function returns a corresponding `uint256 failureMap` containing the actual failures that have happened.
If all actions succeeded, the value `uint256(0)` will be returned.
If the third action failed, for example, because the NFT was already sold or the DAO had not enough DAI, a failure map value `uint256(4)` is returned

```solidity
... 0 0 0 1 0 0 // the value 4 in binary representation
... 5 4 3 2 1 0 // the indices of the action array items that are allowed to fail.
```

On the frontend, these conversions will be handled automatically.
