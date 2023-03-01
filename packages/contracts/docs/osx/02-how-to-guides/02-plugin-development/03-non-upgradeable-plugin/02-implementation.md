---
title: Implementation
---

## Writing the Implementation Logic

Since we took care of the initialization of our plugin, we can now implement the implementation logic by adding an external `execute` function to the contract receiving the actions to be executed.

```solidity
/// @notice Executes actions in the associated DAO.
function execute(IDAO.Action[] calldata _actions) external {
  revert('Unsafe and not implemented.');
}
```

This is unsafe, because everybody would be able to call this function. Accordingly, the first thing we want to do is to add a permission to the `execute` function because otherwise, everybody would be able to execute actions on the DAO. Because we have initialized the [`PluginClonable` base contract](../../../03-reference-guide/core/plugin/PluginCloneable.md), we can now use its features, i.e., the [`auth` modifier](../../../03-reference-guide/core/plugin/dao-authorizable/DaoAuthorizable.md#internal-modifier-auth) it provides through the `DaoAuthorizable` base class.
Later, we will also use the [`dao()` getter function](../../../03-reference-guide/core/plugin/dao-authorizable/DaoAuthorizable.md#public-function-dao) returning the associated DAO.

For this, we define a [permission identifier](../../../01-how-it-works/01-core/02-permissions/index.md#permission-identifiers) `bytes32` constant at the top of the contract obtained from the hash `keccak256` hash of the permission name we want to choose. Here, we called it the `ADMIN_EXECUTE_PERMISSION` and created the associated permission ID.

<details>
<summary><code>SimpleAdmin</code>: Adding <code>modifier auth</code> to <code>function execute</code></summary>

```solidity
contract SimpleAdmin is PluginCloneable {
  /// @notice The ID of the permission required to call the `execute` function.
  bytes32 public constant ADMIN_EXECUTE_PERMISSION_ID = keccak256('ADMIN_EXECUTE_PERMISSION');

  address public admin;

  /// @notice Initializes the contract.
  /// @param _dao The associated DAO.
  /// @param _admin The address of the admin.
  function initialize(IDAO _dao, address _admin) external initializer {
    __PluginCloneable_init(_dao);
    admin = _admin;
  }

  /// @notice Executes actions in the associated DAO.
  function execute(IDAO.Action[] calldata _actions) external auth(ADMIN_EXECUTE_PERMISSION_ID) {
    revert('Not implemented.');
  }
}
```

</details>

:::note
You are free to choose the permission name however you like. For example, you could also have used `keccak256('SIMPLE_ADMIN_PLUGIN:PERMISSION_1')`. However, it is important that the permission names are descriptive and cannot be confused with each other.
:::

Since the external function can now only be called by authorized callers holding the `ADMIN_EXECUTE_PERMISSION`, we can complete the implementation.

<details>
<summary><code>SimpleAdmin</code>: Implementing <code>function execute</code></summary>

```solidity
contract SimpleAdmin is PluginCloneable {
  /// @notice The ID of the permission required to call the `execute` function.
  bytes32 public constant ADMIN_EXECUTE_PERMISSION_ID = keccak256('ADMIN_EXECUTE_PERMISSION');

  address public admin;

  /// @notice Initializes the contract.
  /// @param _dao The associated DAO.
  /// @param _admin The address of the admin.
  function initialize(IDAO _dao, address _admin) external initializer {
    __PluginCloneable_init(_dao);
    admin = _admin;
  }

  /// @notice Executes actions in the associated DAO.
  /// @param _actions The actions to be executed by the DAO.
  function execute(IDAO.Action[] calldata _actions) external auth(ADMIN_EXECUTE_PERMISSION_ID) {
    dao().execute({callId: 0x0, actions: _actions, allowFailureMap: 0});
  }
}
```

</details>

For now, we used default values for the `callId` and `allowFailureMap` parameters required by the DAO's `execute` function. With this, the plugin implementation could be used and deployed already.

However, since this is a governance plugin, we have to tidy it up a bit more and make sure that the actions proposed and taken as well as the DAO members introduced by the plugin can be properly indexed and displayed on the aragonApp frontend. For this, we describe how to complete the governance plugin by [implementing the `IProposal` and `IMembership` interfaces](../05-governance-plugins/index.md).
Optionally, you can also allow certain actions to fail by using [the failure map feature of the DAO executor](../../../01-how-it-works/01-core/01-dao/01-actions.md#allowing-for-failure).

In the next step, we'll write the `PluginSetup` contract.
