---
title: Implementation
---

## Implementing the Logic

Since we took care of the initialization of our upgradeable plugin, we can now implement the logic.

#### Build 0: Adding Permissions

In build 0, we want to add an authorized `storeNumber` function to the contract allowing a caller holding the `STORE_PERMISSION_ID` permission to change the stored value similar to what we did for [the non-upgradeable `SimpleAdmin`](../03-non-upgradeable-plugin/02-implementation.md):

<details>
<summary><code>SimpleStorageBuild0</code></summary>

```solidity
import {PluginUUPSUpgradeable, IDAO} '@aragon/osx/core/plugin/PluginUUPSUpgradeable.sol';

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

### Subsequent Builds

#### Build 1: Adding Storage

In build 1, we added a second storage variable `address public account;`. Additional to the `initializeFromBuild0` function, we want to add a second setter function `storeAccount` that uses the same permission as `storeNumber`. This looks as follows:

<details>
<summary><code>SimpleStorageBuild1</code></summary>

```solidity
import {PluginUUPSUpgradeable, IDAO} '@aragon/osx/core/plugin/PluginUUPSUpgradeable.sol';

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

Builds that you publish don't necessarily need to introduce new storage varaibles of your contracts don't necessarily need to change the storage.

#### Build 2: Changes Affecting the Bytecode

Updates for your contracts don't necessarily need to affect the storage. They can also just be related to the bytecode, which involve changes to

- functions
- constants
- immutables
- events
- errors

For build 2, we decided to introduce two separate permissions for the `storeNumber` and `storeAccount` functions and named them `STORE_NUMBER_PERMISSION_ID` and `STORE_ACCOUNT_PERMISSION_ID` permission, respectively. Additionally, we decided to add the `NumberStored` and `AccountStored` events as well as an error preventing users from setting the same value twice. All these changes only affect the contract bytecode and not the storage.

<details>
<summary><code>SimpleStorageBuild2</code></summary>

```solidity
import {PluginUUPSUpgradeable, IDAO} '@aragon/osx/core/plugin/PluginUUPSUpgradeable.sol';

/// @title SimpleStorage v1.2
contract SimpleStorageBuild2 is PluginUUPSUpgradeable {
  bytes32 public constant STORE_NUMBER_PERMISSION_ID = keccak256('STORE_NUMBER_PERMISSION'); // changed in v1.2
  bytes32 public constant STORE_ACCOUNT_PERMISSION_ID = keccak256('STORE_ACCOUNT_PERMISSION'); // added in v1.2

  uint256 public number; // added in v1.0
  address public account; // added in v1.1

  // added in v1.2
  event NumberStored(uint256 number);
  event AccountStored(address number);
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

:::note
Despite no storage-related changes happening in build 2, we must apply the `reinitializer(3)` modifier to all `initialize` functions so that none of them can be called twice or in the wrong order.
:::

Here, it is important to remember how Solidity stores `constant`s (and `immutable`s). In contrast to normal variables, they are directly written into the bytecode on contract creation so that we don't need to worry that the second `bytes32` constant that we added shifts down the storage so that the value in `uint256 public number` gets lost.
It is also important to note that, the `initializeFromBuild1` could be left empty. Here, we just emit the events with the currently stored values.
