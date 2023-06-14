---
title: Subsequent Builds for Upgradeable Plugins
---

## How to create a subsequent build to an Upgradeable Plugin

A build is a new implementation of your Upgradeable Plugin. Upgradeable contracts offer advantages because you can cheaply change or fix the logic of your contract without losing the storage of your contract.

The Aragon OSx protocol has an on-chain versioning system built-in, which distinguishes between releases and builds.

- **Releases** contain breaking changes, which are incompatible with preexisting installations. Updates to a different release are not possible. Instead, you must install the new plugin release and uninstall the old one.
- **Builds** are minor/patch versions within a release, and they are meant for compatible upgrades only (adding a feature or fixing a bug without changing anything else).

In this how to guide, we'll go through how we can create these builds for our plugins. Specifically, we'll showcase two specific types of builds - one that modifies the storage of the plugins, another one which modifies its bytecode. Both are possible and can be implemented within the same build implementation as well.

### 1. Make sure your previous build is deployed and published

Make sure you have at least one build already deployed and published into the Aragon protocol. Make sure to check out our [publishing guide](../07-publication/index.md) to ensure this step is done.

### 2. Create a new build implementation

In this second build implementation we want to update the functionality of our plugin - in this case, we want to update the storage of our plugin with new values. Specifically, we will add a second storage variable `address public account;`. Additional to the `initializeFromBuild2` function, we also want to add a second setter function `storeAccount` that uses the same permission as `storeNumber`.

As you can see, we're still inheritting from the `PluginUUPSUpgradeable` contract and simply overriding some implementation from the previous build. The idea is that when someone upgrades the plugin and calls on these functions, they'll use this new upgraded implementation, rather than the older one.

```solidity
import {PluginUUPSUpgradeable, IDAO} '@aragon/osx/core/plugin/PluginUUPSUpgradeable.sol';

/// @title SimpleStorage build 2
contract SimpleStorageBuild2 is PluginUUPSUpgradeable {
  bytes32 public constant STORE_PERMISSION_ID = keccak256('STORE_PERMISSION');

  uint256 public number; // added in build 1
  address public account; // added in build 2

  /// @notice Initializes the plugin when build 2 is installed.
  function initializeBuild2(
    IDAO _dao,
    uint256 _number,
    address _account
  ) external reinitializer(2) {
    __PluginUUPSUpgradeable_init(_dao);
    number = _number;
    account = _account;
  }

  /// @notice Initializes the plugin when the update from build 1 to build 2 is applied.
  /// @dev The initialization of `SimpleStorageBuild1` has already happened.
  function initializeFromBuild1(address _account) external reinitializer(2) {
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

Builds that you publish don't necessarily need to introduce new storage varaibles of your contracts and don't necessarily need to change the storage. To read more about Upgradeability, check out [OpenZeppelin's UUPSUpgradeability implementation here](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable).

:::note
Note that because these contracts are Upgradeable, keeping storage gaps `uint256 [50] __gap;` in dependencies is a must in order to avoid storage corruption. To learn more about storage gaps, review OpenZeppelin's documentation [here](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps).
:::

### 3. Alternatively, a build implementation modifying bytecode

Updates for your contracts don't necessarily need to affect the storage, they can also modify the plugin's bytecode. Modifying the contract's bytecode, means making changes to:

- functions
- constants
- immutables
- events
- errors

For this third build, then, we want to change the bytecode of our implementation as an example, so we 've introduced two separate permissions for the `storeNumber` and `storeAccount` functions and named them `STORE_NUMBER_PERMISSION_ID` and `STORE_ACCOUNT_PERMISSION_ID` permission, respectively. Additionally, we decided to add the `NumberStored` and `AccountStored` events as well as an error preventing users from setting the same value twice. All these changes only affect the contract bytecode and not the storage.

Here, it is important to remember how Solidity stores `constant`s (and `immutable`s). In contrast to normal variables, they are directly written into the bytecode on contract creation so that we don't need to worry that the second `bytes32` constant that we added shifts down the storage so that the value in `uint256 public number` gets lost.
It is also important to note that, the `initializeFromBuild2` could be left empty. Here, we just emit the events with the currently stored values.

```solidity
import {PluginUUPSUpgradeable, IDAO} '@aragon/osx/core/plugin/PluginUUPSUpgradeable.sol';

/// @title SimpleStorage build 3
contract SimpleStorageBuild3 is PluginUUPSUpgradeable {
  bytes32 public constant STORE_NUMBER_PERMISSION_ID = keccak256('STORE_NUMBER_PERMISSION'); // changed in build 3
  bytes32 public constant STORE_ACCOUNT_PERMISSION_ID = keccak256('STORE_ACCOUNT_PERMISSION'); // added in build 3

  uint256 public number; // added in build 1
  address public account; // added in build 2

  // added in build 3
  event NumberStored(uint256 number);
  event AccountStored(address number);
  error AlreadyStored();

  /// @notice Initializes the plugin when build 3 is installed.
  function initializeBuild3(
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

  /// @notice Initializes the plugin when the update from build 2 to build 3 is applied.
  /// @dev The initialization of `SimpleStorageBuild2` has already happened.
  function initializeFromBuild2() external reinitializer(3) {
    emit NumberStored({number: number});
    emit AccountStored({account: account});
  }

  /// @notice Initializes the plugin when the update from build 1 to build 3 is applied.
  /// @dev The initialization of `SimpleStorageBuild1` has already happened.
  function initializeFromBuild1(address _account) external reinitializer(3) {
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

:::note
Despite no storage-related changes happening in build 3, we must apply the `reinitializer(3)` modifier to all `initialize` functions so that none of them can be called twice or in the wrong order.
:::
