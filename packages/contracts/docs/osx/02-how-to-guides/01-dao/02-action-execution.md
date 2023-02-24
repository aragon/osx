---
title: Executing Actions
---

## Using the DAO Executor

For the `execute` call to work, the `msg.sender` must have the [`EXECUTE_PERMISSION_ID` permission](../../01-how-it-works/01-core/02-permissions/index.md#permissions-native-to-the-dao-contract) on the DAO contract.

### Sending Native Tokens

Send `0.1 ETH` from the DAO treasury to Alice.
The corresponding `Action` and `execute` function call look as follows:

```solidity
function exampleNativeTokenTransfer(IDAO dao, bytes32 _callId, address _receiver) {
  // Create the action array
  IDAO.Action[] memory actions = new IDAO.Action[](1);

  actions[0] = IDAO.Action({to: _receiver, value: 0.1 ether, data: ''});

  // Execute the action array
  dao.execute({_callId: _callId, _actions: actions, _allowFailureMap: 0});
}
```

### Calling a Function

Imagine that you want to call an external function, let's say in an `Calculator` contract that adds two numbers for you. The corresponding `Action` and `execute` function call look as follows:

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
    data: abi.encodeWithSelector(_calculator.add.selector, _a, _b)
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
    data: abi.encodeWithSelector(IWETH9.deposit.selector) // abi.encodeWithSelector(bytes4(keccak256('deposit()')), [])
  });

  // Execute the action array
  dao.execute({_callId: _callId, _actions: actions, _allowFailureMap: 0});
}
```

### Calling a DAO Function

Imagine that you want to call an internal function inside the `DAO` contract, for example, to manually [grant or revoke a permission](../../01-how-it-works/01-core/02-permissions/index.md). The corresponding `Action` and `execute` function call look as follows:

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

Here we use the selector of [`grant` function](../../03-reference-guide/core/permission/PermissionManager.md/#external-function-grant). To revoke the permission, the selector of [`revoke` function](../../03-reference-guide/core/permission/PermissionManager.md/#external-function-revoke) must be used.

If the caller possesses the [`ROOT_PERMISSION_ID` permission](../../01-how-it-works/01-core/02-permissions/index.md#permissions-native-to-the-dao-contract) on the DAO contract, the call becomes simpler and cheaper:

```solidity
function exampleGrant(DAO dao, address _where, address _who, bytes32 _permissionId) {
  dao.grant(_where, _who, _permissionId); // For this to work, the `msg.sender` needs the `ROOT_PERMISSION_ID`
}
```

:::caution
Granting the `ROOT_PERMISSION_ID` permission to other contracts then the `DAO` contract is dangerous and considered as an anti-pattern.
:::
