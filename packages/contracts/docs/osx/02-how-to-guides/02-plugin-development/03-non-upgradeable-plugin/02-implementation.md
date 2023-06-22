---
title: Building the Plugin Implementation Contract
---

## How to Build a Non-Upgradeable Plugin

Once we've initialized our plugin (take a look at our guide on [how to initialize Non-Upgradeable Plugins here](./01-initialization.md)), we can start using the Non-Upgradeable Base Template to perform actions on the DAO.

### 1. Set the Permission Identifier

Firstly, we want to define a [permission identifier](../../../01-how-it-works/01-core/02-permissions/index.md#permission-identifiers) `bytes32` constant at the top of the contract and establish a `keccak256` hash of the permission name we want to choose. In this example, we're calling it the `ADMIN_EXECUTE_PERMISSION`.

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

:::note
You are free to choose the permission name however you like. For example, you could also have used `keccak256('SIMPLE_ADMIN_PLUGIN:PERMISSION_1')`. However, it is important that the permission names are descriptive and cannot be confused with each other.
:::

Setting this permission is key because it ensures only signers who have been granted that permission are able to execute functions.

### 2. Add the logic implementation

Now that we have created the permission, we will use it to protect the implementation. We want to make sure only the authorized callers holding the `ADMIN_EXECUTE_PERMISSION`, can use the function.

Because we have initialized the [`PluginClonable` base contract](../../../03-reference-guide/core/plugin/PluginCloneable.md), we can now use its features, i.e., the [`auth` modifier](../../../03-reference-guide/core/plugin/dao-authorizable/DaoAuthorizable.md#internal-modifier-auth) provided through the `DaoAuthorizable` base class. The `auth('ADMIN_EXECUTE_PERMISSION')` returns an error if the address calling on the function has not been granted that permission, effectively protecting from malicious use cases.

Later, we will also use the [`dao()` getter function from the base contract](../../../03-reference-guide/core/plugin/dao-authorizable/DaoAuthorizable.md#public-function-dao), which returns the associated DAO for that plugin.

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

:::note
In this example, we are building a governance plugin. To increase its capabilities and provide some standardization into the protocol, we recommend completing the governance plugin by [implementing the `IProposal` and `IMembership` interfaces](../05-governance-plugins/index.md).
Optionally, you can also allow certain actions to fail by using [the failure map feature of the DAO executor](../../../01-how-it-works/01-core/01-dao/01-actions.md#allowing-for-failure).
:::

For now, we used default values for the `callId` and `allowFailureMap` parameters required by the DAO's `execute` function. With this, the plugin implementation could be used and deployed already. Feel free to add any additional logic to your plugin's capabilities here.

### 3. Plugin done, Setup contract next!

Now that we have the logic for the plugin implemented, we'll need to define how this plugin should be installed/uninstalled from a DAO. In the next step, we'll write the `PluginSetup` contract - the one containing the installation, uninstallation, and upgrading instructions for the plugin.
