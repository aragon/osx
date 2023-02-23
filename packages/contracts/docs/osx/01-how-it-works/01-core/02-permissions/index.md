---
title: Permissions
---

## Managing Your DAO

At Aragon, we believe that **DAOs are permission management systems**.
Permissions between contracts and wallets allow a DAO to manage and govern its actions.

Here, you will learn how the permissions in Aragon OSx work, how they can be granted and revoked from wallets and contracts, and how they are managed through the DAO.

As we mentioned earlier, it is essential that only the right person or contract can execute a certain action. As a developer, you might have seen or used [modifiers such as `onlyOwner`](https://docs.openzeppelin.com/contracts/2.x/api/ownership#Ownable) in contracts. This `onlyOwner` modifier provides basic access control to your DAO: only the `owner` address is permitted to execute the function to which the modifier is attached.

In Aragon OSx, we follow the same approach but provide more advanced functionality:
Each `DAO` contracts includes a `PermissionManager` contract allowing to flexibly, securely, and collectively manage permissions through the DAO and, thus, govern its actions.
This `PermissionManager`, called `ACL` in previous Aragon OS versions, was one big reason why our protocol never got hacked.
The code and configuration of a DAO specifies which wallets or contracts (`who`) are allowed to call which authorized functions on a target contract (`where`).
Identifiers, permissions, and modifiers link everything together.

### Permission Identifiers

To differentiate between different permissions, permission **identifiers** are used that you will frequently find at the top of Aragon OSx contracts. They look something like this:

```solidity title="@aragon/osx/core/dao/DAO.sol"
bytes32 public constant EXECUTE_PERMISSION_ID = keccak256("EXECUTE_PERMISSION");
```

### Permissions

A permission specifies an address `who` being allowed to call certain functions on a contract address `where`. In the `PermissionManager` contract, permissions are defined as the concatenation of the word `"PERMISSION"` with the `who` and `where` address, as well as the `bytes32` permission identifier `permissionId`.

```solidity title="@aragon/osx/core/permission/PermissionManager.sol"
function permissionHash(
  address _where,
  address _who,
  bytes32 _permissionId
) internal pure returns (bytes32) {
  return keccak256(abi.encodePacked('PERMISSION', _who, _where, _permissionId));
}
```

This concatenated information is then stored as `keccak256` hashes inside a mapping like this one:

```solidity title="@aragon/osx/core/permission/PermissionManager.sol"
mapping(bytes32 => address) internal permissionsHashed;
```

Here, the `bytes32` keys are the permission hashes and the `address` values are either zero-address flags, such as `ALLOW_FLAG = address(0)` and `UNSET_FLAG = address(2)` indicating if the permission is set, or an actual address pointing to a `PermissionCondition` contract, which is discussed in the next section of this guide.

### Authorization Modifiers

Using **authorization modifiers** is how we make functions permissioned. Permissions are associated with functions by adding the `auth` modifier, which includes the permission identifier in the function’s definition header.

For example, one can call the `execute` function in the DAO when the address making the call has been granted the `EXECUTE_PERMISSION_ID` permission.

```solidity title="@aragon/osx/core/dao/DAO.sol"
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

```solidity title="@aragon/osx/core/permission/PermissionManager.sol"
function grant(
  address _where,
  address _who,
  bytes32 _permissionId
) external auth(_where, ROOT_PERMISSION_ID);
```

To prevent these functions from being called by any address, they are themselves permissioned via the `auth` modifier and require the caller to have the `ROOT_PERMISSION_ID` permission in order to call them.

:::note
Typically, the `ROOT_PERMISSION_ID` permission is granted only to the `DAO` contract itself. Contracts related to the Aragon infrastructure temporarily require it during the [DAO creation](../../02-framework/01-dao-creation/index.md) and [plugin setup ](../../02-framework/02-plugin-management/02-plugin-setup/index.md) processes.
:::note

This means, that these functions can only be called through the DAO’s `execute` function that, in turn, requires the calling address to have the `EXECUTE_PERMISSION_ID` permission.

:::note
Typically, the `EXECUTE_PERMISSION_ID` permission is granted to governance contracts (such as a majority voting plugin owned by the DAO or a multi-sig). Accordingly, a proposal is often required to change permissions.
Exceptions are, again, the [DAO creation](../../02-framework/01-dao-creation/index.md) and [plugin setup ](../../02-framework/02-plugin-management/02-plugin-setup/index.md) processes.
:::

#### Granting Permission with Conditions

Aragon OSx supports relaying the authorization of a function call to another contract inheriting from the `IPermissionCondition` interface. This works by granting the permission with the `grantWithCondition` function

```solidity title="@aragon/osx/core/permission/PermissionManager.sol"
function grantWithCondition(
  address _where,
  address _who,
  bytes32 _permissionId,
  IPermissionCondition _condition
) external auth(_where, ROOT_PERMISSION_ID) {}
```

and specifying the `_condition` contract address. This provides full flexibility to customize the conditions under which the function call is allowed.

Typically, conditions are written specifically for and installed together with [plugins](../../01-core/03-plugins/index.md).

To learn more about this advanced topic and possible applications, visit the [permission conditions](./01-conditions.md) section.

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
By granting the `USE_PERMISSION_ID` to `_who: ANY_ADDR` on the contract `_where: serviceAddr` you allow everyone to call the `use()` function and you can add more conditions to it. If you later on decide that you want to be more selective about who is allowed to call it, you can revoke the permission to `ANY_ADDR`.

Granting a permission with `_where: ANY_ADDR` to a condition has the effect that is granted on every contract. This is useful if you want to give an address `_who` permission over a large set of contracts that would be too costly or too much work to be granted on a per-contract basis.
Imagine, for example, that many instances of the `Service` contract exist, and a user should have the permission to use all of them. By granting the `USE_PERMISSION_ID` with `_where: ANY_ADDR`, to some user `_who: userAddr`, the user has access to all of them. If this should not be possible anymore, you can later revoke the permission.

However, some restrictions apply. For security reasons, Aragon OSx does not allow you to use both, `_where: ANY_ADDR` and `_who: ANY_ADDR` in the same permission. Furthermore, the permission IDs of [permissions native to the `DAO` Contract](#permissions-native-to-the-dao-contract) cannot be used.

### Permissions Native to the `DAO` Contract

The following functions in the DAO are permissioned:

| Functions                               | Permission Identifier                      | Description                                                                                                     |
| --------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `grant`, `grantWithCondition`, `revoke` | `ROOT_PERMISSION_ID`                       | Required to manage permissions of the DAO and associated plugins.                                               |
| `execute`                               | `EXECUTE_PERMISSION_ID`                    | Required to execute arbitrary actions.                                                                          |
| `_authorizeUpgrade`                     | `UPGRADE_DAO_PERMISSION_ID`                | Required to upgrade the DAO (via the [UUPS](https://eips.ethereum.org/EIPS/eip-1822)).                          |
| `setMetadata`                           | `SET_METADATA_PERMISSION_ID`               | Required to set the DAO’s metadata and [DAOstar.one DAO URI](https://eips.ethereum.org/EIPS/eip-4824).          |
| `setTrustedForwarder`                   | `SET_TRUSTED_FORWARDER_PERMISSION_ID`      | Required to set the DAO’s trusted forwarder for meta transactions.                                              |
| `setSignatureValidator`                 | `SET_SIGNATURE_VALIDATOR_PERMISSION_ID`    | Required to set the DAO’s signature validator contract (see ERC-1271).                                          |
| `registerStandardCallback`              | `REGISTER_STANDARD_CALLBACK_PERMISSION_ID` | Required to register a standard callback for an [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID. |

Plugins installed on the DAO might introduce other permissions and associated permission identifiers.

In the next section, you will learn how to customize your DAO by installing plugins.
