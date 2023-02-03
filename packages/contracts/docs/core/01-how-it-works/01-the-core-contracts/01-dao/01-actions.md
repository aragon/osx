---
title: Advanced Action Execution
---

## A Deep Dive into Actions and Execution

The DAO's `execute` function is part of the `DAO.sol` contract and has the following function header:

```solidity title="contracts/core/DAO.sol"
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

It offers two features that we will dive into in this article.
First, it allows the execution of an array of arbitrary `Action` items.
Second, it allows individual actions to fail selectively, without reverting the entire transaction.

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
3. try to but NFT B for `125` DAI
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

In analogy and after an action array with a provided allow-failure map was executed successfully in the DAO, the `execute` function returns a corresponding `uint256 failureMap` containing the actual failures that have happend.
If all actions succeeded, the value `uint256(0)` will be returned.
If the third action failed, for example, because the NFT was already sold or the DAO had not enough DAI, a failure map value `uint256(4)` is returned

```solidity
... 0 0 0 1 0 0 // the value 4 in binary representation
... 5 4 3 2 1 0 // the indices of the action array items that are allowed to fail.
```

On the frontend, these conversions will be handled automatically.
