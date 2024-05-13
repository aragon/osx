---
title: Plugin Setup Contract
---

## What is the Plugin Setup contract?

The Plugin Setup contract is the contract defining the instructions for installing, uninstalling, or upgrading plugins into DAOs. This contract prepares the permission granting or revoking that needs to happen in order for plugins to be able to perform actions on behalf of the DAO.

You need it for the plugin to be installed into the DAO.

### 1. Finish the Plugin contract

Before building your Plugin Setup contract, make sure you have the logic for your plugin implemented. In this case, we're building a simple admin plugin which grants one address permission to execute actions on behalf of the DAO.

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
    dao().execute({_callId: 0x0, _actions: _actions, _allowFailureMap: 0});
  }
}
```

### 2. How to initialize the Plugin Setup contract

Each `PluginSetup` contract is deployed only once and we will publish a separate `PluginSetup` instance for each version. Accordingly, we instantiate the `implementation` contract via Solidity's `new` keyword as deployment with the minimal proxy pattern would be more expensive in this case.

```solidity
// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.21;

import {PluginSetup, IPluginSetup} from '@aragon/osx/framework/plugin/setup/PluginSetup.sol';
import {SimpleAdmin} from './SimpleAdmin.sol';

contract SimpleAdminSetup is PluginSetup {
  /// @notice The address of `SimpleAdmin` plugin contract to be cloned.
  address private immutable simpleAdminImplementation;

  /// @notice The constructor setting the `SimpleAdmin` implementation contract to clone from.
  constructor() {
    simpleAdminImplementation = address(new SimpleAdmin());
  }

  /// @inheritdoc IPluginSetup
  function implementation() external view returns (address) {
    return simpleAdminImplementation;
  }
}
```

### 3. Build the Skeleton

In order for the Plugin to be easily installed into the DAO, we need to define the permissions the plugin will need.

We will create a `prepareInstallation()` function, as well as a `prepareUninstallation()` function. These are the functions the `PluginSetupProcessor.sol` (the contract in charge of installing plugins into the DAO) will use to prepare the installation/uninstallation of the plugin into the DAO.

For example, a skeleton for our `SimpleAdminSetup` contract inheriting from `PluginSetup` looks as follows:

```solidity
import {PermissionLib} from '@aragon/osx/core/permission/PermissionLib.sol';

contract SimpleAdminSetup is PluginSetup {
  /// @notice The address of `SimpleAdmin` plugin logic contract to be cloned.
  address private immutable simpleAdminImplementation;

  /// @notice The constructor setting the `SimpleAdmin` implementation contract to clone from.
  constructor() {
    simpleAdminImplementation = address(new SimpleAdmin());
  }

  /// @inheritdoc IPluginSetup
  function prepareInstallation(
    address _dao,
    bytes calldata _data
  ) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
    revert('Not implemented yet.');
  }

  /// @inheritdoc IPluginSetup
  function prepareUninstallation(
    address _dao,
    SetupPayload calldata _payload
  ) external view returns (PermissionLib.MultiTargetPermission[] memory permissions) {
    revert('Not implemented yet.');
  }

  /// @inheritdoc IPluginSetup
  function implementation() external view returns (address) {
    return simpleAdminImplementation;
  }
}
```

As you can see, we have a constructor storing the implementation contract instantiated via the `new` method in the private immutable variable `implementation` to save gas and a `implementation` function to retrieve it.

Next, we will add the implementation for the `prepareInstallation` and `prepareUninstallation` functions.

### 4. Implementing the `prepareInstallation()` function

The `prepareInstallation()` function should take in two parameters:

1. the `DAO` it prepares the installation for, and
2. the `_data` parameter containing all the information needed for this function to work properly, in this case, the address we want to set as admin of our DAO.

Hence, the first thing we should do when working on the `prepareInstallation()` function is decode the information from the `_data` parameter. We also want to check that the address is not accidentally set to `address(0)`, which would freeze the DAO forever.

```solidity
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';

contract SimpleAdminSetup is PluginSetup {
  using Clones for address;

  /// @notice Thrown if the admin address is zero.
  /// @param admin The admin address.
  error AdminAddressInvalid(address admin);

  // ...
}
```

Then, we will use [OpenZeppelin's `Clones` library](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Clones) to clone our Plugin contract and initialize it with the `admin` address. The first line, `using Clones for address;`, allows us to call OpenZeppelin `Clones` library to clone contracts deployed at an address.

The second line introduces a custom error being thrown if the admin address specified is the zero address.

```solidity
function prepareInstallation(
  address _dao,
  bytes calldata _data
) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
  // Decode `_data` to extract the params needed for cloning and initializing the `Admin` plugin.
  address admin = abi.decode(_data, (address));

  if (admin == address(0)) {
    revert AdminAddressInvalid({admin: admin});
  }

  // Clone plugin contract.
  plugin = implementation.clone();

  // Initialize cloned plugin contract.
  SimpleAdmin(plugin).initialize(IDAO(_dao), admin);

  // Prepare permissions
  PermissionLib.MultiTargetPermission[]
    memory permissions = new PermissionLib.MultiTargetPermission[](2);

  // Grant the `ADMIN_EXECUTE_PERMISSION` of the plugin to the admin.
  permissions[0] = PermissionLib.MultiTargetPermission({
    operation: PermissionLib.Operation.Grant,
    where: plugin,
    who: admin,
    condition: PermissionLib.NO_CONDITION,
    permissionId: SimpleAdmin(plugin).ADMIN_EXECUTE_PERMISSION_ID()
  });

  // Grant the `EXECUTE_PERMISSION` on the DAO to the plugin.
  permissions[1] = PermissionLib.MultiTargetPermission({
    operation: PermissionLib.Operation.Grant,
    where: _dao,
    who: plugin,
    condition: PermissionLib.NO_CONDITION,
    permissionId: DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
  });

  preparedSetupData.permissions = permissions;
}
```

Finally, we construct and return an array with the permissions that we need for our plugin to work properly.

- First, we request granting the `ADMIN_EXECUTE_PERMISSION_ID` to the `admin` address received. This is what gives the address access to use `plugin`'s functionality - in this case, call on the plugin's `execute` function so it can execute actions on behalf of the DAO.
- Second, we request that our newly deployed plugin can use the `EXECUTE_PERMISSION_ID` permission on the `_dao`. We don't add conditions to the permissions in this case, so we use the `NO_CONDITION` constant provided by `PermissionLib`.

### 5. Implementing the `prepareUninstallation()` function

For the uninstallation, we have to make sure to revoke the two permissions that have been granted during the installation process.
First, we revoke the `ADMIN_EXECUTE_PERMISSION_ID` from the `admin` address that we have stored in the implementation contract.
Second, we revoke the `EXECUTE_PERMISSION_ID` from the `plugin` address that we obtain from the `_payload` calldata.

```solidity
function prepareUninstallation(
  address _dao,
  SetupPayload calldata _payload
) external view returns (PermissionLib.MultiTargetPermission[] memory permissions) {
  // Collect addresses
  address plugin = _payload.plugin;
  address admin = SimpleAdmin(plugin).admin();

  // Prepare permissions
  permissions = new PermissionLib.MultiTargetPermission[](2);

  permissions[0] = PermissionLib.MultiTargetPermission({
    operation: PermissionLib.Operation.Revoke,
    where: plugin,
    who: admin,
    condition: PermissionLib.NO_CONDITION,
    permissionId: SimpleAdmin(plugin).ADMIN_EXECUTE_PERMISSION_ID()
  });

  permissions[1] = PermissionLib.MultiTargetPermission({
    operation: PermissionLib.Operation.Revoke,
    where: _dao,
    who: plugin,
    condition: PermissionLib.NO_CONDITION,
    permissionId: DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
  });
}
```

#### 6. Putting Everything Together

Now, it's time to wrap up everything together. You should have a contract that looks like this:

```solidity
// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.21;

import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';

import {PermissionLib} from '@aragon/osx/core/permission/PermissionLib.sol';
import {PluginSetup, IPluginSetup} from '@aragon/osx/framework/plugin/setup/PluginSetup.sol';
import {SimpleAdmin} from './SimpleAdmin.sol';

contract SimpleAdminSetup is PluginSetup {
  using Clones for address;

  /// @notice The address of `SimpleAdmin` plugin logic contract to be cloned.
  address private immutable simpleAdminImplementation;

  /// @notice Thrown if the admin address is zero.
  /// @param admin The admin address.
  error AdminAddressInvalid(address admin);

  /// @notice The constructor setting the `Admin` implementation contract to clone from.
  constructor() {
    simpleAdminImplementation = address(new SimpleAdmin());
  }

  /// @inheritdoc IPluginSetup
  function prepareInstallation(
    address _dao,
    bytes calldata _data
  ) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
    // Decode `_data` to extract the params needed for cloning and initializing the `Admin` plugin.
    address admin = abi.decode(_data, (address));

    if (admin == address(0)) {
      revert AdminAddressInvalid({admin: admin});
    }

    // Clone plugin contract.
    plugin = implementation.clone();

    // Initialize cloned plugin contract.
    SimpleAdmin(plugin).initialize(IDAO(_dao), admin);

    // Prepare permissions
    PermissionLib.MultiTargetPermission[]
      memory permissions = new PermissionLib.MultiTargetPermission[](2);

    // Grant the `ADMIN_EXECUTE_PERMISSION` of the plugin to the admin.
    permissions[0] = PermissionLib.MultiTargetPermission({
      operation: PermissionLib.Operation.Grant,
      where: plugin,
      who: admin,
      condition: PermissionLib.NO_CONDITION,
      permissionId: SimpleAdmin(plugin).ADMIN_EXECUTE_PERMISSION_ID()
    });

    // Grant the `EXECUTE_PERMISSION` on the DAO to the plugin.
    permissions[1] = PermissionLib.MultiTargetPermission({
      operation: PermissionLib.Operation.Grant,
      where: _dao,
      who: plugin,
      condition: PermissionLib.NO_CONDITION,
      permissionId: DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
    });

    preparedSetupData.permissions = permissions;
  }

  /// @inheritdoc IPluginSetup
  function prepareUninstallation(
    address _dao,
    SetupPayload calldata _payload
  ) external view returns (PermissionLib.MultiTargetPermission[] memory permissions) {
    // Collect addresses
    address plugin = _payload.plugin;
    address admin = SimpleAdmin(plugin).admin();

    // Prepare permissions
    permissions = new PermissionLib.MultiTargetPermission[](2);

    permissions[0] = PermissionLib.MultiTargetPermission({
      operation: PermissionLib.Operation.Revoke,
      where: plugin,
      who: admin,
      condition: PermissionLib.NO_CONDITION,
      permissionId: SimpleAdmin(plugin).ADMIN_EXECUTE_PERMISSION_ID()
    });

    permissions[1] = PermissionLib.MultiTargetPermission({
      operation: PermissionLib.Operation.Revoke,
      where: _dao,
      who: plugin,
      condition: PermissionLib.NO_CONDITION,
      permissionId: DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
    });
  }

  /// @inheritdoc IPluginSetup
  function implementation() external view returns (address) {
    return simpleAdminImplementation;
  }
}
```

Once done, our plugin is ready to be published on the Aragon plugin registry. With the address of the `SimpleAdminSetup` contract, we are ready for creating our `PluginRepo`, the plugin's repository where all plugin versions will live. Check out our how to guides on [publishing your plugin here](../07-publication/index.md).

### In the future: Subsequent Builds

For subsequent builds or releases of your plugin, you'll simply write a new implementation and associated Plugin Setup contract providing a new `prepareInstallation` and `prepareUninstallation` function.

If a DAO wants to install the new build or release, it must uninstall its current plugin and freshly install the new plugin version, which can happen in the same action array in a governance proposal. However, the plugin storage and event history will be lost since this is a non-upgradeable plugin. If you want to prevent the latter, you can learn [how to write an upgradeable plugin here](../03-non-upgradeable-plugin/index.md).
