---
title: Executing actions on behalf of the DAO
---

## Using the DAO Executor

Executing actions on behalf of the DAO is done through the `execute` function from the `DAO.sol` contract. This function allows us to [pass an array of actions)](https://github.com/aragon/osx/blob/develop/packages/contracts/src/core/dao/DAO.sol) to be executed by the DAO contract itself.

However, for the `execute` call to work, the address calling the function (the `msg.sender`) needs to have the [`EXECUTE_PERMISSION`](../../how-it-works/core/permissions#permissions-native-to-the-dao-contract). This is to prevent anyone from being able to execute actions on behalf of the DAO and keep your assets safe from malicious actors.

## How to grant the Execute Permission

Usually, the `EXECUTE_PERMISSION` is granted to a governance plugin of the DAO so that only the approved proposals can be executed. For example, we'd grant the `EXECUTE_PERMISSION` to the address of the Multisig Plugin. That way, when a proposal is approved by the required members of the multisig, the plugin is able to call the `execute` function on the DAO in order to get the actions executed.

To grant the `EXECUTE_PERMISSION` to an address, you'll want to call on the `PermissionManager`'s [`grant` function](https://github.com/aragon/osx/blob/develop/packages/contracts/src/core/permission/PermissionManager.sol#L105) and pass it 4 parameters:

- `where`: the address of the contract containing the function `who` wants access to
- `who`: the address (EOA or contract) receiving the permission
- `permissionId`: the permission identifier the caller needs to have in order to be able to execute the action
- `condition`: the address of the condition contract that will be asked (if any) before authorizing the call to happen

:::caution
You probably don't want to grant `EXECUTE_PERMISSION` to any random address, since this gives the address access to execute any action on behalf of the DAO. We recommend you only grant `EXECUTE_PERMISSION` to governance plugins to ensure the safety of your assets. Granting `EXECUTE_PERMISSION` to an externally owned account is considered an anti-pattern.
:::

## Examples

### Calling a DAO Function

Imagine you want to call an internal function inside the `DAO` contract, for example, to manually [grant or revoke a permission](../../how-it-works/core/permissions). The corresponding `Action` and `execute` function call look as follows:

```solidity
function exampleGrantCall(
  DAO dao,
  bytes32 _callId,
  address _where,
  address _who,
  bytes32 _permissionId
) {
  // Create the action array
  IDAO.Action[] memory actions = new IDAO.Action[](1);
  actions[0] = IDAO.Action({
    to: address(dao),
    value: 0,
    data: abi.encodeWithSelector(PermissionManager.grant.selector, _where, _who, _permissionId)
  });

  // Execute the action array
  (bytes[] memory execResults, ) = dao.execute({
    _callId: _callId,
    _actions: actions,
    _allowFailureMap: 0
  });
}
```

Here we use the selector of the [`grant` function](../../reference-guide/core/permission/PermissionManager#external-function-grant). To revoke the permission, the selector of the [`revoke` function](../../reference-guide/core/permission/PermissionManager#external-function-revoke) must be used.

If the caller possesses the [`ROOT_PERMISSION_ID` permission](../../how-it-works/core/permissions#permissions-native-to-the-dao-contract) on the DAO contract, the call becomes simpler and cheaper:

:::caution
Granting the `ROOT_PERMISSION_ID` permission to other contracts other than the `DAO` contract is dangerous and considered as an anti-pattern.
:::

```solidity
function exampleGrantFunction(DAO dao, address _where, address _who, bytes32 _permissionId) {
  dao.grant(_where, _who, _permissionId); // For this to work, the `msg.sender` needs the `ROOT_PERMISSION_ID`
}
```

### Sending Native Tokens

Send `0.1 ETH` from the DAO treasury to Alice.
The corresponding `Action` and `execute` function call would look as follows:

```solidity
function exampleNativeTokenTransfer(IDAO dao, bytes32 _callId, address _receiver) {
  // Create the action array
  IDAO.Action[] memory actions = new IDAO.Action[](1);

  actions[0] = IDAO.Action({to: _receiver, value: 0.1 ether, data: ''});

  // Execute the action array
  dao.execute({_callId: _callId, _actions: actions, _allowFailureMap: 0});
}
```

### Calling a Function from an External Contract

Imagine that you want to call an external function, let's say in a `Calculator` contract that adds two numbers for you. The corresponding `Action` and `execute` function call look as follows:

```solidity
contract ICalculator {
  function add(uint256 _a, uint256 _b) external pure returns (uint256 sum);
}

function exampleFunctionCall(
  IDAO dao,
  bytes32 _callId,
  ICalculator _calculator,
  uint256 _a,
  uint256 _b
) {
  // Create the action array
  IDAO.Action[] memory actions = new IDAO.Action[](1);
  actions[0] = IDAO.Action({
    to: address(_calculator),
    value: 0, // 0 native tokens must be sent with this call
    data: abi.encodeCall(_calculator.add, (_a, _b))
  });

  // Execute the action array
  (bytes[] memory execResults, ) = dao.execute({
    _callId: _callId,
    _actions: actions,
    _allowFailureMap: 0
  });

  // Decode the action results
  uint256 sum = abi.decode(execResults[0], (uint256)); // the result of `add(_a,_b)`
}
```

### Calling a Payable Function

Wrap `0.1 ETH` from the DAO treasury into `wETH` by depositing it into the [Goerli WETH9 contract](https://goerli.etherscan.io/token/0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6#writeContract).
The corresponding `Action` and `execute` function call look as follows:

```solidity
interface IWETH9 {
  function deposit() external payable;

  function withdraw(uint256 _amount) external;
}

function examplePayableFunctionCall(IDAO dao, bytes32 _callId, IWETH9 _wethToken) {
  // Create the action array

  IDAO.Action[] memory actions = new IDAO.Action[](1);

  actions[0] = IDAO.Action({
    to: address(_wethToken),
    value: 0.1 ether,
    data: abi.encodeCall(IWETH9.deposit, ())
  });

  // Execute the action array
  dao.execute({_callId: _callId, _actions: actions, _allowFailureMap: 0});
}
```
