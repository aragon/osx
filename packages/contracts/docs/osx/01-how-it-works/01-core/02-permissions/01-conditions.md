---
title: Conditions
---

## Permission Conditions

Permission conditions relay the decision if an authorized call is permitted to another contract.
This contract must implement the `IPermissionCondition` interface.

```solidity title="@aragon/osx/core/permission/IPermissionCondition.sol"
interface IPermissionCondition {
  /// @notice This method is used to check if a call is permitted.
  /// @param _where The address of the target contract.
  /// @param _who The address (EOA or contract) for which the permission are checked.
  /// @param _permissionId The permission identifier.
  /// @param _data Optional data passed to the `PermissionCondition` implementation.
  /// @return allowed Returns true if the call is permitted.
  function isGranted(
    address _where,
    address _who,
    bytes32 _permissionId,
    bytes calldata _data
  ) external view returns (bool allowed);
}
```

By implementing the `isGranted` function, any number of custom conditions can be added to the permission.
These conditions can be based on

- The specific properties of

  - The caller `who`
  - The target `where`

- The calldata `_data` of the function such as

  - Function signature
  - Parameter values

- General on-chain data such as

  - Timestamps
  - Token ownership
  - Entries in curated registries

- off-chain data being made available through oracle services (e.g., [chain.link](https://chain.link/), [witnet.io](https://witnet.io/)) such as

  - Market data
  - Weather data
  - Scientific data
  - Sports data

The following examples illustrate

## Examples

:::caution
The following code examples serve educational purposes and are not intended to be used in production.
:::

Let’s assume we have an `Example` contract managed by a DAO `_dao` containing a `sendCoins` function allowing you to send an `_amount` to an address `_to` and being permissioned through the `auth` modifier:

```solidity title="Example.sol"
contract Example is Plugin {
  constructor(IDAO _dao) Plugin(_dao) {}

  function sendCoins(address _to, uint256 _amount) external auth(SEND_COINS_PERMISSION_ID) {
    // logic to send `_amount` coins to the address `_to`...
  }
}
```

Let's assume you own the private key to address `0x123456...` and the `Example` contract was deployed to address `0xabcdef...`.
Now, to be able to call the `sendCoins` function, you need to `grant` the `SEND_COINS_PERMISSION_ID` permission to your wallet address (`_who=0x123456...`) for the `Example` contract (`_where=0xabcdef...`).
If this is the case, the function call will succeed, otherwise it will revert.

We can now add additional constraints to it by using the `grantWithCondition` function.
Below, we show four exemplary conditions for different 4 different use cases that we could attach to the permission.

### Condition 1: Adding Parameter Constraints

Let’s imagine that we want to make sure that `_amount` is not more than `1 ETH` without changing the code of `Example` contract.

We can realize this requirement by deploying a `ParameterConstraintCondition` condition.

```solidity title="ParameterConstraintCondition.sol"
contract ParameterConstraintCondition is IPermissionCondition {
	uint256 internal maxValue;

	constructor(uint256 _maxValue) {
      	maxValue = _maxValue;
    }

	function isGranted(
		address _where,
		address _who,
		bytes32 _permissionId,
		bytes calldata _data
	) external view returns (bool) {
    (_where, _who, _permissionId); // Prevent compiler warnings resulting from unused arguments.

    (address _to, uint256 _amount) = abi.decode(_data, (address, uint256));

		return _amount <= _maxValue;
}
```

Now, after granting the `SEND_COINS_PERMISSION_ID` permission to `_where` and `_who` via the `grantWithCondition` function and pointing to the `ParameterConstraintCondition` condition contract, the `_who` address can only call the `sendCoins` of the `Example` contract deployed at address `_where` successfully if `_amount` is not larger than `_maxValue` stored in the condition contract.

### Condition 2: Delaying a Call With a Timestamp

In another use-case, we might want to make sure that the `sendCoins` can only be called after a certain date. This would look as following:

```solidity title="TimeCondition.sol"
contract TimeCondition is IPermissionCondition {
  uint256 internal date;

  constructor(uint256 _date) {
    date = _date;
  }

  function isGranted(
    address _where,
    address _who,
    bytes32 _permissionId,
    bytes calldata _data
  ) external view returns (bool) {
    (_where, _who, _permissionId, _data); // Prevent compiler warnings resulting from unused arguments

    return block.timestamp > date;
  }
}
```

Here, the permission condition will only allow the call the `_date` specified in the constructor has passed.

### Condition 3: Using Curated Registries

In another use-case, we might want to make sure that the `sendCoins` function can only be called by real humans to prevent sybil attacks. For this, let's say we use the [Proof of Humanity (PoH)](https://www.proofofhumanity.id/) registry providing a curated list of humans:

```solidity title="IProofOfHumanity.sol"
interface IProofOfHumanity {
  function isRegistered(address _submissionID) external view returns (bool);
}

contract ProofOfHumanityCondition is IPermissionCondition {
  IProofOfHumanity internal registry;

  constructor(IProofOfHumanity _registry) {
    registry = _registry;
  }

  function isGranted(
    address _where,
    address _who,
    bytes32 _permissionId,
    bytes calldata _data
  ) external view returns (bool) {
    (_where, _permissionId, _data); // Prevent compiler warnings resulting from unused arguments

    return registry.isRegistered(_who);
  }
}
```

Here, the permission condition will only allow the call if the PoH registry confirms that the `_who` address is registered and belongs to a real human.

#### Condition 4: Using a Price Oracle

In another use-case, we might want to make sure that the `sendCoins` function can only be called if the ETH price in USD is above a certain threshold:

<!-- prettier-ignore -->
```solidity title="PriceOracle.sol"
import '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';

contract PriceOracle is IPermissionCondition {
  AggregatorV3Interface internal priceFeed;

  // Network: Goerli
  // Aggregator: ETH/USD
  // Address: 0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e
  constructor() {
    priceFeed = AggregatorV3Interface(
      0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e
    );
  }

  function isGranted(
    address _where,
    address _who,
    bytes32 _permissionId,
    bytes calldata _data
  ) external view returns (bool) {
    (_where, _who, _permissionId, _data); // Prevent compiler warnings resulting from unused arguments

    (
      /*uint80 roundID*/,
      int256 price,
      /*uint startedAt*/,
      /*uint timeStamp*/,
      /*uint80 answeredInRound*/
    ) = priceFeed.latestRoundData();

    return price > 9000 * 10**18; // It's over 9000!
  }
}

Here, we use [a data feed from a Chainlink oracle](https://docs.chain.link/docs/data-feeds/) providing us with the latest ETH/USD price on the Goerli testnet and require that the call is only allowed if the ETH price is over $9000.

````
