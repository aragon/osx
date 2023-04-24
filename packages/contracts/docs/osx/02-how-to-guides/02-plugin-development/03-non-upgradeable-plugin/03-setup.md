---
title: Setup
---

## Developing the Setup Contract for Non-upgradeable Contracts

<details>
<summary>The <code>SimpleAdmin</code> Implementation</summary>

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

</details>

Let's again start with the deployment and initialization. Here, it is simple because each `PluginSetup` contract is deployed only once, which is also the case for upgradeable plugins, where we will publish a separate `PluginSetup` contract for each version. Accordingly, we instantiate the `implementation` contract via Solidity's `new` keyword as deployment with the minimal proxy pattern would be more expensive in this case.

<details>
<summary><code>SimpleAdminSetup</code>: Initializing the <code>PluginSetup</code></summary>

```solidity
// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.17;

import {PluginSetup, IPluginSetup} from '@aragon/osx/framework/plugin/setup/PluginSetup.sol';
import {SimpleAdmin} from './SimpleAdmin.sol';

contract SimpleAdminSetup is PluginSetup {
  /// @notice The address of `SimpleAdmin` plugin logic contract to be cloned.
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

</details>

The skeleton of our `SimpleAdminSetup` contract inheriting from `PluginSetup` looks as follows:

<details>
<summary><code>SimpleAdminSetup</code>: The Sekeleton</summary>

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
    revert('Not implemented.');
  }

  /// @inheritdoc IPluginSetup
  function prepareUninstallation(
    address _dao,
    SetupPayload calldata _payload
  ) external view returns (PermissionLib.MultiTargetPermission[] memory permissions) {
    revert('Not implemented.');
  }

  /// @inheritdoc IPluginSetup
  function implementation() external view returns (address) {
    return simpleAdminImplementation;
  }
}
```

</details>

We have a constructor storing the implementation contract instantiated via `new` in the private immutable variable `implementation` to save gas and a `implementation` function to return it.
Next, we have two external functions, `prepareInstallation` and `prepareUninstallation` that we are going to implement.

### Implementing the `prepareInstallation` function

<details>
<summary><code>SimpleAdminSetup</code>: Implementing the <code>function prepareInstallation</code></summary>

```solidity
function prepareInstallation(
  address _dao,
  bytes calldata _data
) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
  // Decode `_data` to extract the params needed for cloning and initializing `Admin` plugin.
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

  // Grant the `ADMIN_EXECUTE_PERMISSION` of the Plugin to the admin.
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

</details>

At the top of the function, we first decode the `admin` address from the `_data` provided and check, that it is not accidentally set to `address(0)`. In the next step, we clone the plugin contract using [OpenZepplin's `Clones` library](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Clones) and initialize it with the `admin` address. For this to work, we had to include the following three code lines at the top of the file:

<details>
<summary><code>SimpleAdminSetup</code>: Adding the <code>Clones</code> library and the <code>error AdminAddressInvalid</code></summary>

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

</details>

Finally, we construct an array of permission operations requesting two permissions to be granted that is returned by the function. First, we request the `ADMIN_EXECUTE_PERMISSION_ID` permission for the `admin` (`who`) address on the `plugin` (`where`). Second, we request the `EXECUTE_PERMISSION_ID` permission for the freshly deployed `plugin` (`who`) on the `_dao` (`where`). We don't add conditions to the permissions, so we use the `NO_CONDITION` constant provided by `PermissionLib`.

The first line, `using Clones for address;`, allows us to call OpenZepplin `Clones` library to clone contracts deployed at an address.
The second line introduces a custom error being thrown if the admin address specified is the zero address.

### Implementing the `prepareUninstallation` function

For the uninstallation, we have to make sure two revoke the two permissions that have been granted during the installation.
First, we revoke the `ADMIN_EXECUTE_PERMISSION_ID` from the `admin` address that we have stored in the implementation contract.
Second, we revoke the `EXECUTE_PERMISSION_ID` from the `plugin` address that we obtain from the `_payload` calldata.

<details>
<summary><code>SimpleAdmin</code></summary>

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

</details>

#### Putting Everything Together

After putting everything together, we obtain the final `SimpleAdminSetup` contract being ready for publication in a `PluginRepo` and registered in Aragon's `PluginRepoRegistry`.

<details>
<summary>The Final <code>SimpleAdminSetup</code> Contract</summary>

```solidity
// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.17;

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
    // Decode `_data` to extract the params needed for cloning and initializing `Admin` plugin.
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

    // Grant the `ADMIN_EXECUTE_PERMISSION` of the Plugin to the admin.
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

</details>

### Subsequent Builds

For subsequent builds or releases, you simply write a new implementation and associated setup contract providing an `prepareInstallation` and `prepareUninstallation` function. If a DAO wants to install the new build or release, it must uninstall its current plugin and freshly install the new plugin version, which can happen in the same action array in a governance proposal. However, the plugin storage and event history will be lost since this is a non-upgradeable plugin. If you want to prevent the latter, you can learn how to write an upgradeable plugin in the next section.
