---
title: Permissions
---

## Managing and Governing Your DAO

At Aragon, we believe that **DAOs are permission management systems**.
Permissions between contracts and wallets allow a DAO to manage and govern its actions.

Here, you will learn how the permissions in aragonOS work how they can be granted and revoked from wallets and contracts, and managed through the DAO.

As we mentioned earlier, it is essential that only the right person or contract can execute a certain action. As a developer, you might have seen or used [modifiers such as `onlyOwner`](https://docs.openzeppelin.com/contracts/2.x/api/ownership#Ownable) in contracts. This `onlyOwner` modifier provides basic access control to your DAO: only the `owner` address is permitted to execute the function to which the modifier is attached.

In aragonOS, we follow the same approach but provide more advanced functionality:
Each `DAO` contracts includes a `PermissionManager` contract allowing to flexibly, securely, and collectively manage permissions through the DAO and, thus, govern its actions.
This `PermissionManager`, called `ACL` in previous aragonOS contract versions, was one big reason why aragonOS never got hacked.
The code and configuration of a DAO specifies which wallets or contracts (`who`) are allowed to call which authorized functions on a target contract (`where`).
Identifiers, permissions, and modifiers link everything together.

### Permission Identifiers

To differentiate between each permission, we give permissions **identifiers** that you will frequently find at the top of aragonOS contracts. They look something like this:

```solidity title="contracts/core/DAO.sol"
bytes32 public constant EXECUTE_PERMISSION_ID = keccak256("EXECUTE_PERMISSION");
```

### Permissions

A permission specifies an address `who` being allowed to call certain functions on a contract address `where`. In the `PermissionManager` contract, permissions are defined as the concatenation of the word `"PERMISSION"` with the `who` and `where` address, as well as the `bytes32` permission identifier `permissionId`.

```solidity title="contracts/core/permission/PermissionManager.sol"
function permissionHash(
  address _where,
  address _who,
  bytes32 _permissionId
) internal pure returns (bytes32) {
  return keccak256(abi.encodePacked('PERMISSION', _who, _where, _permissionId));
}
```

This concatenated information is then stored as `keccak256` hashes inside a mapping like this one:

```solidity title="contracts/core/permission/PermissionManager.sol"
mapping(bytes32 => address) internal permissionsHashed;
```

Here, the `bytes32` keys are the permission hashes and the `address` values are either zero-address flags, such as `ALLOW_FLAG = address(0)` and `UNSET_FLAG = address(2)` indicating if the permission is set, or an actual address pointing to a `PermissionCondition` contract, which is discussed in the next section of this guide.

### Authorization Modifiers

Using **authorization modifiers** is how we make functions permissioned. Permissions are associated with functions by adding the `auth` modifier, which includes the permission identifier in the function’s definition header.

For example, one can call the `execute` function in the DAO when the address making the call has been granted the `EXECUTE_PERMISSION_ID` permission.

```solidity title="contracts/core/DAO.sol"
function execute(
  bytes32 callId,
  Action[] calldata _actions,
  uint256 allowFailureMap
)
  external
  override
  auth(address(this), EXECUTE_PERMISSION_ID)
  returns (bytes[] memory execResults, uint256 failureMap);
```

### Managing Permissions

To manage permissions, the DAO contract has the `grant`, `revoke` and `grantWithCondition` functions in its public interface.

#### Granting and Revoking Permissions

The `grant` and `revoke` functions are the main functions we use to manage permissions.
Both receive the `_permissionId` identifier of the permission and the `_where` and `_who` addresses as arguments.

```solidity title="contracts/core/permission/PermissionManager.sol"
function grant(
  address _where,
  address _who,
  bytes32 _permissionId
) external auth(_where, ROOT_PERMISSION_ID);
```

To prevent these functions from being called by any address, they are themselves permissioned via the `auth` modifier and require the caller to have the `ROOT_PERMISSION_ID` permission in order to call them.

:::note
By default, the `ROOT_PERMISSION_ID` permission is granted only to the `DAO` contract itself. Contracts related to the Aragon infrastructure temporarily require it during the [DAO creation](../02-the-dao-framework/01-dao-creation-process.md) and [plugin setup ](../02-the-dao-framework/02-plugin-repository/04-plugin-setup.md) processes.
:::note

This means, that these functions can only be called through the DAO’s `execute` function that, in turn, requires the calling address to have the `EXECUTE_PERMISSION_ID` permission.

:::note
By default, the `EXECUTE_PERMISSION_ID` permission is granted to governance contracts (such as a majority voting plugin owned by the DAO or a multi-sig). Accordingly, a proposal is often required to change permissions.
Exceptions are, again, the [DAO creation](../02-the-dao-framework/01-dao-creation-process.md) and [plugin setup ](../02-the-dao-framework/02-plugin-repository/04-plugin-setup.md) processes.
:::

#### Granting Permission with Conditions

:::note
This is and advanced topic that you might want to skip when learning about aragonOS permissions for the first time.
:::

AragonOS 6 supports relaying the authorization of a function call to a custom condition inheriting from the `IPermissionCondition` contract interface. This works by granting the permission with the `grantWithCondition` function

```solidity title="contracts/core/permission/PermissionManager.sol"
function grantWithCondition(
  address _where,
  address _who,
  bytes32 _permissionId,
  IPermissionCondition _condition
) external auth(_where, ROOT_PERMISSION_ID) {}
```

and specifying the `_condition` address. This provides full flexibility to customize the conditions under which the function call is allowed.

These conditions can be based on the calldata of the function such as

- parameter values
- function signature

on-chain data such as

- timestamps
- token ownership
- entries in curated registries

or off-chain data being made available through third-party oracle services (e.g., [chain.link](https://chain.link/), [witnet.io](https://witnet.io/)) such as

- market data
- weather data
- scientific data
- sports data

Typically, conditions are written specifically for and installed together with [plugins](../01-the-core-contracts/03-plugins.md).

#### Granting Permission to `ANY_ADDR`

In combination with conditions, the arguments `_where` and `_who` can be set to `ANY_ADDR = address(type(uint160).max)`.
Granting a permission with `_who: ANY_ADDR` has the effect that any address can now call the function so that it behaves as if the `auth` modifier is not present.
Imagine, for example, you wrote a decentralized service

```solidity
contract Service {
  function use() external auth(USE_PERMISSION_ID);
}
```

Calling the `use()` function inside requires the caller to have the `USE_PERMISSION_ID` permission. Now, you want to make this service available to every user without uploading a new contract or requiring every user to ask for the permission.
By granting the `USE_PERMISSION_ID` to `_who: ANY_ADDR` on the contract `_where: serviceAddr` to a condition, you can allow everyone to use it and add more conditions to it. If you later on decide to make it permissioned again, you can revoke the permission to `ANY_ADDR`.

Granting a permission with `_where: ANY_ADDR` to a condition has the effect that is granted on every contract. This is useful if you want to give an address `_who` permission over a large set of contracts that would be too costly or too much work to be granted on a per-contract basis.
Imagine, for example, that many instances of the `Service` contract exist, and a user should have the permission to use all of them. By granting the `USE_PERMISSION_ID` with `_where: ANY_ADDR`, to some user `_who: userAddr`, the user has access to all of them. If this should not be possible anymore, you can later revoke the permission.

However, some restrictions apply. For security reasons, aragonOS does not allow you to use both, `_where: ANY_ADDR` and `_who: ANY_ADDR` in the same permission. Furthermore, the permission IDs of [permissions native to the `DAO` Contract](#permissions-native-to-the-dao-contract) cannot be used.

### Permissions Native to the `DAO` Contract

The following functions in the DAO are permissioned:

| Functions                               | Permission Identifier                   | Description                                                                            |
| --------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------- |
| `execute`                               | `EXECUTE_PERMISSION_ID`                 | Required to execute arbitrary actions.                                                 |
| `_authorizeUpgrade`                     | `UPGRADE_DAO_PERMISSION_ID`             | Required to upgrade the DAO (via the [UUPS](https://eips.ethereum.org/EIPS/eip-1822)). |
| `setMetadata`                           | `SET_METADATA_PERMISSION_ID`            | Required to set the DAO’s metadata.                                                    |
| `setTrustedForwarder`                   | `SET_TRUSTED_FORWARDER_PERMISSION_ID`   | Required to set the DAO’s trusted forwarder for meta transactions.                     |
| `setSignatureValidator`                 | `SET_SIGNATURE_VALIDATOR_PERMISSION_ID` | Required to set the DAO’s signature validator contract (see ERC-1271).                 |
| `grant`, `grantWithCondition`, `revoke` | `ROOT_PERMISSION_ID`                    | Required to manage permissions of the DAO and associated plugins.                      |

Plugins installed to the DAO might require their own and introduce new permission settings.

In the next section, you will learn how to customize your DAO by installing plugins.

### Examples

Let’s assume we have an `Example` contract managed by a DAO `_dao` containing a `sendCoins` function allowing you to send an `_amount` to an address `_to` and being permissioned through the `auth` modifier:

```solidity title="Example.sol"
contract Example is Plugin {
  constructor(IDAO _dao) Plugin(_dao) {}

  function sendCoins(
    address _to,
    uint256 _value
  ) external auth(SEND_COINS_PERMISSION_ID) {
    // logic to send coins safely to an address `_to`...
  }
}
```

Let's assume you own the private key to address `0x123456...` and the `Example` contract was deployed to address `0xabcdef...`.
Now, to be able to call the `sendCoins` function, you need to `grant` the `SEND_COINS_PERMISSION_ID` permission to your wallet address (`_who=0x123456...`) for the `Example` contract (`_where=0xabcdef...`).
If this is the case, the function call will succeed, otherwise it will revert.

We can now add additional constraints to it by using the `grantWithCondition` function.
Below, we show four exemplary conditions for different 4 different use cases that we could attach to the permission.

#### Condition 1: Adding Parameter Constraints

Let’s imagine that we want to make sure that `_value` is not more than `1 ETH` without changing the code of `Example` contract.

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

    (address _to, uint256 _value) = abi.decode(_data, (address, uint256));

		return _value <= _maxValue;
}
```

Now, after granting the `SEND_COINS_PERMISSION_ID` permission to `_where` and `_who` via the `grantWithCondition` function and pointing to the `ParameterConstraintCondition` condition contract, the `_who` address can only call the `sendCoins` of the `Example` contract deployed at address `_where` successfully if `_value` is not larger than `_maxValue` stored in the condition contract.

#### Condition 2: Delaying a Call With a Timestamp

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

#### Condition 3: Using Curated Registries

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

#### Condition 4: Using Price Conditions

In another use-case, we might want to make sure that the `sendCoins` function can only be called if the ETH price in USD is above a certain threshold:

<!-- prettier-ignore -->
```solidity title="PriceCondition.sol"
import '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';

contract PriceCondition is IPermissionCondition {
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
