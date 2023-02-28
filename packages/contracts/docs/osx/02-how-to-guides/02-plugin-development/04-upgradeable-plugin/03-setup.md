---
title: Setup Upgradeable Plugins
---

## Developing the Setup Contract for Upgradeable Contracts

Now, we show the setup contracts associated with the 3 builds we have implemented in the last section.

### Build 0

<details>
<summary><code>SimpleStorageBuild0</code></summary>

```solidity
import {PluginUUPSUpgradeable} from '@aragon/osx-contracts/core/plugin/PluginUUPSUpgradeable.sol';

/// @title SimpleStorage v1.0
contract SimpleStorageBuild0 is PluginUUPSUpgradeable {
  bytes32 public constant STORE_PERMISSION_ID = keccak256('STORE_PERMISSION');

  uint256 public number; // added in v1.0

  /// @notice Initializes the plugin when v1.0 is installed.
  function initializeBuild0(IDAO _dao, uint256 _number) external initializer {
    __PluginUUPSUpgradeable_init(_dao);
    number = _number;
  }

  function storeNumber(uint256 _number) external auth(STORE_PERMISSION_ID) {
    number = _number;
  }
}
```

</details>

For the first version, the setup is very similar to the [setup example for the non-upgradeable `SimpleAdmin` plugin](../03-non-upgradeable-plugin/03-setup.md). We have to implement the `prepareInstallation` and `prepareUninstallation` functions.

<details>
<summary><code>SimpleStorageBuild0Setup</code></summary>

```solidity
import {PermissionLib} from '@aragon/osx-contracts/core/permissions/PermissionsLib.sol';
import {PluginSetup, IPluginSetup} from '@aragon/osx-contracts/framework/plugin/setup/PluginSetup.sol';
import {SimpleStorageBuild0} from './SimpleStorageBuild0.sol';

/// @title SimpleStorageSetup v1.0
contract SimpleStorageBuild0Setup is PluginSetup {
  constructor() PluginSetup(address(new SimpleStorageBuild0)) {}

  /// @inheritdoc IPluginSetup
  function prepareInstallation(
    address _dao,
    bytes memory _data
  ) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
    uint256 number = abi.decode(_data, (uint256));

    plugin = createERC1967Proxy(
      implementation,
      abi.encodeWithSelector(SimpleStorageBuild0.initializeBuild0.selector, _dao, number)
    );

    PermissionLib.MultiTargetPermission[]
      memory permissions = new PermissionLib.MultiTargetPermission[](1);

    permissions[0] = PermissionLib.MultiTargetPermission({
      operation: PermissionLib.Operation.Grant,
      where: plugin,
      who: _dao,
      condition: PermissionLib.NO_CONDITION,
      permissionId: SimpleStorageBuild0(implementation).STORE_PERMISSION_ID()
    });

    preparedSetupData.permissions = permissions;
  }

  /// @inheritdoc IPluginSetup
  function prepareUninstallation(
    address _dao,
    SetupPayload calldata _payload
  ) external view returns (PermissionLib.MultiTargetPermission[] memory permissions) {
    permissions = new PermissionLib.MultiTargetPermission[](1);

    permissions[0] = PermissionLib.MultiTargetPermission({
      operation: PermissionLib.Operation.Revoke,
      where: _payload.plugin,
      who: _dao,
      condition: PermissionLib.NO_CONDITION,
      permissionId: SimpleStorageBuild0(implementation).STORE_PERMISSION_ID()
    });
  }
}
```

</details>

### Build 1

<details>
<summary><code>SimpleStorageBuild1</code></summary>

```solidity
/// @title SimpleStorage v1.1
contract SimpleStorageBuild1 is PluginUUPSUpgradeable {
  bytes32 public constant STORE_PERMISSION_ID = keccak256('STORE_PERMISSION');

  uint256 public number; // added in v1.0
  address public account; // added in v1.1

  /// @notice Initializes the plugin when v1.1 is installed.
  function initializeBuild1(
    IDAO _dao,
    uint256 _number,
    address _account
  ) external reinitializer(2) {
    __PluginUUPSUpgradeable_init(_dao);
    number = _number;
    account = _account;
  }

  /// @notice Initializes the plugin when the update from v1.0 to v1.1 is applied.
  /// @dev The initialization of `SimpleStorageBuild0` has already happened.
  function initializeFromBuild0(IDAO _dao, address _account) external reinitializer(2) {
    account = _account;
  }

  function storeNumber(uint256 _number) external auth(STORE_PERMISSION_ID) {
    number = _number;
  }

  function storeAccount(address _account) external auth(STORE_PERMISSION_ID) {
    account = _account;
  }
}
```

</details>

In contrast to build 0, build 1 requires two input arguments: `uint256 _number` and `address _account` that we decode from the bytes-encoded input `_data`.

Additionally, since we want to support updates from build 0 to build 1, we must implement the `prepareUpdate` function. The function must transition the plugin from the old build state into the new one so that it ends up having the same permissions (and helpers) as if it had been freshly installed.

<details>
<summary><code>SimpleStorageBuild1Setup</code></summary>

```solidity
/// @title SimpleStorageSetup v1.1
contract SimpleStorageBuild1Setup is PluginSetup {
  constructor() PluginSetup(address(new SimpleStorageBuild1)) {}

  /// @inheritdoc IPluginSetup
  function prepareInstallation(
    address _dao,
    bytes memory _data
  ) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
    (uint256 _number, address _account) = abi.decode(_data, (uint256, address));

    plugin = createERC1967Proxy(
      implementation,
      abi.encodeWithSelector(SimpleStorageBuild1.initializeBuild1.selector, _dao, _number, _account)
    );

    PermissionLib.MultiTargetPermission[]
      memory permissions = new PermissionLib.MultiTargetPermission[](1);

    permissions[0] = PermissionLib.MultiTargetPermission({
      operation: PermissionLib.Operation.Grant,
      where: plugin,
      who: _dao,
      condition: PermissionLib.NO_CONDITION,
      permissionId: SimpleStorageBuild1(implementation).STORE_PERMISSION_ID()
    });

    preparedSetupData.permissions = permissions;
  }

  /// @inheritdoc IPluginSetup
  function prepareUpdate(
    address _dao,
    uint16 _currentBuild,
    SetupPayload calldata _payload
  )
    external
    view
    override
    returns (bytes memory initData, PreparedSetupData memory preparedSetupData)
  {
    if (_currentBuild == 0) {
      address _account = abi.decode(_payload.data, (address));
      initData = abi.encodeWithSelector(
        SimpleStorageBuild1.initializeFromBuild0.selector,
        _account
      );
    }
  }

  /// @inheritdoc IPluginSetup
  function prepareUninstallation(
    address _dao,
    SetupPayload calldata _payload
  ) external view returns (PermissionLib.MultiTargetPermission[] memory permissions) {
    permissions = new PermissionLib.MultiTargetPermission[](1);

    permissions[0] = PermissionLib.MultiTargetPermission({
      operation: PermissionLib.Operation.Revoke,
      where: _payload.plugin,
      who: _dao,
      condition: PermissionLib.NO_CONDITION,
      permissionId: SimpleStorageBuild1(implementation).STORE_PERMISSION_ID()
    });
  }
}
```

</details>

Let's have a close look at the implemented `prepareUpdate` function. The function only contains a condition checking from which build number the update is transitioning to build 1. Here, it is the build number 0 as this is the only update path we support. Inside, we decode the `address _account` input argument provided with `bytes _date` and pass it to the `initializeFromBuild0` function taking care of intializing the storage that was added in this build.

### Build 2

<details>
<summary><code>SimpleStorageBuild2</code></summary>

```solidity
/// @title SimpleStorage v1.2
contract SimpleStorageBuild2 is PluginUUPSUpgradeable {
  bytes32 public constant STORE_NUMBER_PERMISSION_ID = keccak256('STORE_NUMBER_PERMISSION'); // changed in v1.2
  bytes32 public constant STORE_ACCOUNT_PERMISSION_ID = keccak256('STORE_ACCOUNT_PERMISSION'); // added in v1.2

  uint256 public number; // added in v1.0
  address public account; // added in v1.1

  // added in v1.2
  event NumberStored(uint256 number);
  event AccountStored(address account);
  error AlreadyStored();

  /// @notice Initializes the plugin when v1.2 is installed.
  function initializeBuild2(
    IDAO _dao,
    uint256 _number,
    address _account
  ) external reinitializer(3) {
    __PluginUUPSUpgradeable_init(_dao);
    number = _number;
    account = _account;

    emit NumberStored({number: _number});
    emit AccountStored({account: _account});
  }

  /// @notice Initializes the plugin when the update from v1.1 to v1.2 is applied.
  /// @dev The initialization of `SimpleStorageBuild1` has already happened.
  function initializeFromBuild1() external reinitializer(3) {
    emit NumberStored({number: number});
    emit AccountStored({account: account});
  }

  /// @notice Initializes the plugin when the update from v1.0 to v1.2 is applied.
  /// @dev The initialization of `SimpleStorageBuild0` has already happened.
  function initializeFromBuild0(address _account) external reinitializer(3) {
    account = _account;

    emit NumberStored({number: number});
    emit AccountStored({account: _account});
  }

  function storeNumber(uint256 _number) external auth(STORE_NUMBER_PERMISSION_ID) {
    if (_number == number) revert AlreadyStored();

    number = _number;

    emit NumberStored({number: _number});
  }

  function storeAccount(address _account) external auth(STORE_ACCOUNT_PERMISSION_ID) {
    if (_account == account) revert AlreadyStored();

    account = _account;

    emit AccountStored({account: _account});
  }
}
```

</details>

<details>
<summary><code>SimpleStorageBuild2Setup</code></summary>

```solidity
/// @title SimpleStorageSetup v1.2
contract SimpleStorageBuild2Setup is PluginSetup {
  constructor() PluginSetup(address(new SimpleStorageBuild2)) {}

  /// @inheritdoc IPluginSetup
  function prepareInstallation(
    address _dao,
    bytes memory _data
  ) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
    (uint256 _number, address _account) = abi.decode(_data, (uint256, address));

    plugin = createERC1967Proxy(
      implementation,
      abi.encodeWithSelector(SimpleStorageBuild2.initializeBuild2.selector, _dao, _number, _account)
    );

    PermissionLib.MultiTargetPermission[]
      memory permissions = new PermissionLib.MultiTargetPermission[](2);

    permissions[0] = PermissionLib.MultiTargetPermission({
      operation: PermissionLib.Operation.Grant,
      where: plugin,
      who: _dao,
      condition: PermissionLib.NO_CONDITION,
      permissionId: SimpleStorageBuild2(implementation).STORE_NUMBER_PERMISSION_ID()
    });

    permissions[1] = permissions[0];
    permissions[1].permissionId = SimpleStorageBuild2(implementation).STORE_ACCOUNT_PERMISSION_ID();

    preparedSetupData.permissions = permissions;
  }

  /// @inheritdoc IPluginSetup
  function prepareUpdate(
    address _dao,
    uint16 _currentBuild,
    SetupPayload calldata _payload
  )
    external
    view
    override
    returns (bytes memory initData, PreparedSetupData memory preparedSetupData)
  {
    if (_currentBuild == 0) {
      address _account = abi.decode(_payload.data, (address));
      initData = abi.encodeWithSelector(
        SimpleStorageBuild2.initializeFromBuild0.selector,
        _account
      );
    } else if (_currentBuild == 1) {
      initData = abi.encodeWithSelector(SimpleStorageBuild2.initializeFromBuild1.selector);
    }

    PermissionLib.MultiTargetPermission[]
      memory permissions = new PermissionLib.MultiTargetPermission[](3);
    permissions[0] = PermissionLib.MultiTargetPermission({
      operation: PermissionLib.Operation.Revoke,
      where: _dao,
      who: _payload.plugin,
      condition: PermissionLib.NO_CONDITION,
      permissionId: SimpleStorageBuild1(implementation).STORE_PERMISSION_ID()
    });

    permissions[1] = permissions[0];
    permissions[1].operation = PermissionLib.Operation.Grant;
    permissions[1].permissionId = SimpleStorageBuild2(implementation).STORE_NUMBER_PERMISSION_ID();

    permissions[2] = permissions[1];
    permissions[2].permissionId = SimpleStorageBuild2(implementation).STORE_ACCOUNT_PERMISSION_ID();

    preparedSetupData.permissions = permissions;
  }

  /// @inheritdoc IPluginSetup
  function prepareUninstallation(
    address _dao,
    SetupPayload calldata _payload
  ) external view returns (PermissionLib.MultiTargetPermission[] memory permissions) {
    permissions = new PermissionLib.MultiTargetPermission[](2);

    permissions[0] = PermissionLib.MultiTargetPermission({
      operation: PermissionLib.Operation.Revoke,
      where: _payload.plugin,
      who: _dao,
      condition: PermissionLib.NO_CONDITION,
      permissionId: SimpleStorageBuild2(implementation).STORE_NUMBER_PERMISSION_ID()
    });

    permissions[1] = permissions[1];
    permissions[1].permissionId = SimpleStorageBuild2(implementation).STORE_ACCOUNT_PERMISSION_ID();
  }
}
```

</details>

Let's have a close look at the implemented `prepareUpdate` function. The function only contains a condition checking from which build number the update is transitioning to build 2. Here, we can update from build 0 or build 1 and different operations must happen for each case to transition to `SimpleAdminBuild2`.

In the first case, `initializeFromBuild0` is called taking care of intializing `address _account` that was added in build 1 and emitting the events added in build 2.

In the second case, `initializeFromBuild1` is called taking care of intializing the build. Here, only the two events will be emitted.

Lastly, the `prepareUpdate` function takes care of modifying the permissions by revoking the `STORE_PERMISSION_ID` and granting the more specific `STORE_NUMBER_PERMISSION_ID` and `STORE_ACCOUNT)PERMISSION_ID` permissions, that are also granted if build 2 is freshly installed. This must happen for both update paths so this code is outside the `if` statements.
