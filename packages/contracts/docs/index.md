# Solidity API

## DAO

This contract is the entry point to the Aragon DAO framework and provides our users a simple and easy to use public interface.

_Public API of the Aragon DAO framework._

### EXECUTE_PERMISSION_ID

```solidity
bytes32 EXECUTE_PERMISSION_ID
```

The ID of the permission required to call the `execute` function.

### UPGRADE_DAO_PERMISSION_ID

```solidity
bytes32 UPGRADE_DAO_PERMISSION_ID
```

The ID of the permission required to call the `_authorizeUpgrade` function.

### SET_METADATA_PERMISSION_ID

```solidity
bytes32 SET_METADATA_PERMISSION_ID
```

The ID of the permission required to call the `setMetadata` function.

### SET_TRUSTED_FORWARDER_PERMISSION_ID

```solidity
bytes32 SET_TRUSTED_FORWARDER_PERMISSION_ID
```

The ID of the permission required to call the `setTrustedForwarder` function.

### REGISTER_STANDARD_CALLBACK_PERMISSION_ID

```solidity
bytes32 REGISTER_STANDARD_CALLBACK_PERMISSION_ID
```

The ID of the permission required to call the `registerStandardCallback` function.

### VALIDATE_SIGNATURE_PERMISSION_ID

```solidity
bytes32 VALIDATE_SIGNATURE_PERMISSION_ID
```

The ID of the permission required to validate [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) signatures.

### MAX_ACTIONS

```solidity
uint256 MAX_ACTIONS
```

The internal constant storing the maximal action array length.

### ReentrantCall

```solidity
error ReentrantCall()
```

Thrown if a call is reentrant.

### TooManyActions

```solidity
error TooManyActions()
```

Thrown if the action array length is larger than `MAX_ACTIONS`.

### ActionFailed

```solidity
error ActionFailed(uint256 index)
```

Thrown if action execution has failed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | The index of the action in the action array that failed. |

### InsufficientGas

```solidity
error InsufficientGas()
```

Thrown if an action has insufficient gas left.

### ZeroAmount

```solidity
error ZeroAmount()
```

Thrown if the deposit amount is zero.

### NativeTokenDepositAmountMismatch

```solidity
error NativeTokenDepositAmountMismatch(uint256 expected, uint256 actual)
```

Thrown if there is a mismatch between the expected and actually deposited amount of native tokens.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| expected | uint256 | The expected native token amount. |
| actual | uint256 | The actual native token amount deposited. |

### ProtocolVersionUpgradeNotSupported

```solidity
error ProtocolVersionUpgradeNotSupported(uint8[3] protocolVersion)
```

Thrown if an upgrade is not supported from a specific protocol version .

### FunctionRemoved

```solidity
error FunctionRemoved()
```

Thrown when a function is removed but left to not corrupt the interface ID.

### AlreadyInitialized

```solidity
error AlreadyInitialized()
```

Thrown when initialize is called after it has already been executed.

### NewURI

```solidity
event NewURI(string daoURI)
```

Emitted when a new DAO URI is set.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| daoURI | string | The new URI. |

### nonReentrant

```solidity
modifier nonReentrant()
```

A modifier to protect a function from calling itself, directly or indirectly (reentrancy).

_Currently, this modifier is only applied to the `execute()` function. If this is used multiple times, private `_beforeNonReentrant()` and `_afterNonReentrant()` functions should be created to prevent code duplication._

### onlyCallAtInitialization

```solidity
modifier onlyCallAtInitialization()
```

This ensures that the initialize function cannot be called during the upgrade process.

### constructor

```solidity
constructor() public
```

Disables the initializers on the implementation contract to prevent it from being left uninitialized.

### initialize

```solidity
function initialize(bytes _metadata, address _initialOwner, address _trustedForwarder, string daoURI_) external
```

Initializes the DAO by
- setting the reentrancy status variable to `_NOT_ENTERED`
- registering the [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID
- setting the trusted forwarder for meta transactions
- giving the `ROOT_PERMISSION_ID` permission to the initial owner (that should be revoked and transferred to the DAO after setup).

_This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _metadata | bytes | IPFS hash that points to all the metadata (logo, description, tags, etc.) of a DAO. |
| _initialOwner | address | The initial owner of the DAO having the `ROOT_PERMISSION_ID` permission. |
| _trustedForwarder | address | The trusted forwarder responsible for verifying meta transactions. |
| daoURI_ | string | The DAO URI required to support [ERC-4824](https://eips.ethereum.org/EIPS/eip-4824). |

### initializeFrom

```solidity
function initializeFrom(uint8[3] _previousProtocolVersion, bytes _initData) external
```

Initializes the DAO after an upgrade from a previous protocol version.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _previousProtocolVersion | uint8[3] | The semantic protocol version number of the previous DAO implementation contract this upgrade is transitioning from. |
| _initData | bytes | The initialization data to be passed to via `upgradeToAndCall` (see [ERC-1967](https://docs.openzeppelin.com/contracts/4.x/api/proxy#ERC1967Upgrade)). |

### isPermissionRestrictedForAnyAddr

```solidity
function isPermissionRestrictedForAnyAddr(bytes32 _permissionId) internal pure returns (bool)
```

Decides if the granting permissionId is restricted when `_who == ANY_ADDR` or `_where == ANY_ADDR`.

_By default, every permission is unrestricted and it is the derived contract's responsibility to override it. Note, that the `ROOT_PERMISSION_ID` is included and not required to be set it again._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _permissionId | bytes32 | The permission identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not the permission is restricted. |

### _authorizeUpgrade

```solidity
function _authorizeUpgrade(address) internal virtual
```

Internal method authorizing the upgrade of the contract via the [upgradeability mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).

_The caller must have the `UPGRADE_DAO_PERMISSION_ID` permission._

### setTrustedForwarder

```solidity
function setTrustedForwarder(address _newTrustedForwarder) external
```

Setter for the trusted forwarder verifying the meta transaction.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newTrustedForwarder | address |  |

### getTrustedForwarder

```solidity
function getTrustedForwarder() external view virtual returns (address)
```

Getter for the trusted forwarder verifying the meta transaction.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The trusted forwarder address. |

### hasPermission

```solidity
function hasPermission(address _where, address _who, bytes32 _permissionId, bytes _data) external view returns (bool)
```

Checks if an address has permission on a contract via a permission identifier and considers if `ANY_ADDRESS` was used in the granting process.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _where | address | The address of the contract. |
| _who | address | The address of a EOA or contract to give the permissions. |
| _permissionId | bytes32 | The permission identifier. |
| _data | bytes | The optional data passed to the `PermissionCondition` registered. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Returns true if the address has permission, false if not. |

### setMetadata

```solidity
function setMetadata(bytes _metadata) external
```

Updates the DAO metadata (e.g., an IPFS hash).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _metadata | bytes | The IPFS hash of the new metadata object. |

### execute

```solidity
function execute(bytes32 _callId, struct Action[] _actions, uint256 _allowFailureMap) external returns (bytes[] execResults, uint256 failureMap)
```

Executes a list of actions. If a zero allow-failure map is provided, a failing action reverts the entire execution. If a non-zero allow-failure map is provided, allowed actions can fail without the entire call being reverted.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _callId | bytes32 | The ID of the call. The definition of the value of `callId` is up to the calling contract and can be used, e.g., as a nonce. |
| _actions | struct Action[] | The array of actions. |
| _allowFailureMap | uint256 | A bitmap allowing execution to succeed, even if individual actions might revert. If the bit at index `i` is 1, the execution succeeds even if the `i`th action reverts. A failure map value of 0 requires every action to not revert. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| execResults | bytes[] | The array of results obtained from the executed actions in `bytes`. |
| failureMap | uint256 | The resulting failure map containing the actions have actually failed. |

### deposit

```solidity
function deposit(address _token, uint256 _amount, string _reference) external payable
```

Deposits (native) tokens to the DAO contract with a reference string.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | The address of the token or address(0) in case of the native token. |
| _amount | uint256 | The amount of tokens to deposit. |
| _reference | string | The reference describing the deposit reason. |

### setSignatureValidator

```solidity
function setSignatureValidator(address) external pure
```

Removed function being left here to not corrupt the IDAO interface ID. Any call will revert.

_Introduced in v1.0.0. Removed in v1.4.0._

### isValidSignature

```solidity
function isValidSignature(bytes32 _hash, bytes _signature) external view returns (bytes4)
```

Checks whether a signature is valid for a provided hash according to [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271).

_Relays the validation logic determining who is allowed to sign on behalf of the DAO to its permission manager.
Caller specific bypassing can be set direct granting (i.e., `grant({_where: dao, _who: specificErc1271Caller, _permissionId: VALIDATE_SIGNATURE_PERMISSION_ID})`).
Caller specific signature validation logic can be set by granting with a `PermissionCondition` (i.e., `grantWithCondition({_where: dao, _who: specificErc1271Caller, _permissionId: VALIDATE_SIGNATURE_PERMISSION_ID, _condition: yourConditionImplementation})`)
Generic signature validation logic can be set for all calling contracts by granting with a `PermissionCondition` to `PermissionManager.ANY_ADDR()` (i.e., `grantWithCondition({_where: dao, _who: PermissionManager.ANY_ADDR(), _permissionId: VALIDATE_SIGNATURE_PERMISSION_ID, _condition: yourConditionImplementation})`)._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _hash | bytes32 | The hash of the data to be signed. |
| _signature | bytes | The signature byte array associated with `_hash`. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes4 | Returns the `bytes4` magic value `0x1626ba7e` if the signature is valid and `0xffffffff` if not. |

### receive

```solidity
receive() external payable
```

Emits the `NativeTokenDeposited` event to track native token deposits that weren't made via the deposit method.

_This call is bound by the gas limitations for `send`/`transfer` calls introduced by [ERC-2929](https://eips.ethereum.org/EIPS/eip-2929).
Gas cost increases in future hard forks might break this function. As an alternative, [ERC-2930](https://eips.ethereum.org/EIPS/eip-2930)-type transactions using access lists can be employed._

### fallback

```solidity
fallback(bytes _input) external returns (bytes)
```

Fallback to handle future versions of the [ERC-165](https://eips.ethereum.org/EIPS/eip-165) standard.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _input | bytes | An alias being equivalent to `msg.data`. This feature of the fallback function was introduced with the [solidity compiler version 0.7.6](https://github.com/ethereum/solidity/releases/tag/v0.7.6) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes | The magic number registered for the function selector triggering the fallback. |

### _setMetadata

```solidity
function _setMetadata(bytes _metadata) internal
```

Emits the MetadataSet event if new metadata is set.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _metadata | bytes | Hash of the IPFS metadata object. |

### _setTrustedForwarder

```solidity
function _setTrustedForwarder(address _trustedForwarder) internal
```

Sets the trusted forwarder on the DAO and emits the associated event.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _trustedForwarder | address | The trusted forwarder address. |

### registerStandardCallback

```solidity
function registerStandardCallback(bytes4 _interfaceId, bytes4 _callbackSelector, bytes4 _magicNumber) external
```

Registers an ERC standard having a callback by registering its [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID and callback function signature.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _interfaceId | bytes4 | The ID of the interface. |
| _callbackSelector | bytes4 | The selector of the callback function. |
| _magicNumber | bytes4 | The magic number to be registered for the function signature. |

### daoURI

```solidity
function daoURI() external view returns (string)
```

A distinct Uniform Resource Identifier (URI) pointing to a JSON object following the "EIP-4824 DAO JSON-LD Schema". This JSON file splits into four URIs: membersURI, proposalsURI, activityLogURI, and governanceURI. The membersURI should point to a JSON file that conforms to the "EIP-4824 Members JSON-LD Schema". The proposalsURI should point to a JSON file that conforms to the "EIP-4824 Proposals JSON-LD Schema". The activityLogURI should point to a JSON file that conforms to the "EIP-4824 Activity Log JSON-LD Schema". The governanceURI should point to a flatfile, normatively a .md file. Each of the JSON files named above can be statically hosted or dynamically-generated.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string |  |

### setDaoURI

```solidity
function setDaoURI(string newDaoURI) external
```

Updates the set DAO URI to a new value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newDaoURI | string | The new DAO URI to be set. |

### _setDaoURI

```solidity
function _setDaoURI(string daoURI_) internal
```

Sets the new [ERC-4824](https://eips.ethereum.org/EIPS/eip-4824) DAO URI and emits the associated event.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| daoURI_ | string | The new DAO URI. |

## IEIP4824

_See https://eips.ethereum.org/EIPS/eip-4824_

### daoURI

```solidity
function daoURI() external view returns (string _daoURI)
```

A distinct Uniform Resource Identifier (URI) pointing to a JSON object following the "EIP-4824 DAO JSON-LD Schema". This JSON file splits into four URIs: membersURI, proposalsURI, activityLogURI, and governanceURI. The membersURI should point to a JSON file that conforms to the "EIP-4824 Members JSON-LD Schema". The proposalsURI should point to a JSON file that conforms to the "EIP-4824 Proposals JSON-LD Schema". The activityLogURI should point to a JSON file that conforms to the "EIP-4824 Activity Log JSON-LD Schema". The governanceURI should point to a flatfile, normatively a .md file. Each of the JSON files named above can be statically hosted or dynamically-generated.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _daoURI | string | The DAO URI. |

## PermissionManager

The abstract permission manager used in a DAO, its associated plugins, and other framework-related components.

### ROOT_PERMISSION_ID

```solidity
bytes32 ROOT_PERMISSION_ID
```

The ID of the permission required to call the `grant`, `grantWithCondition`, `revoke`, and `bulk` function.

### ANY_ADDR

```solidity
address ANY_ADDR
```

A special address encoding permissions that are valid for any address `who` or `where`.

### UNSET_FLAG

```solidity
address UNSET_FLAG
```

A special address encoding if a permissions is not set and therefore not allowed.

### ALLOW_FLAG

```solidity
address ALLOW_FLAG
```

A special address encoding if a permission is allowed.

### permissionsHashed

```solidity
mapping(bytes32 => address) permissionsHashed
```

A mapping storing permissions as hashes (i.e., `permissionHash(where, who, permissionId)`) and their status encoded by an address (unset, allowed, or redirecting to a `PermissionCondition`).

### Unauthorized

```solidity
error Unauthorized(address where, address who, bytes32 permissionId)
```

Thrown if a call is unauthorized.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| where | address | The context in which the authorization reverted. |
| who | address | The address (EOA or contract) missing the permission. |
| permissionId | bytes32 | The permission identifier. |

### PermissionAlreadyGrantedForDifferentCondition

```solidity
error PermissionAlreadyGrantedForDifferentCondition(address where, address who, bytes32 permissionId, address currentCondition, address newCondition)
```

Thrown if a permission has been already granted with a different condition.

_This makes sure that condition on the same permission can not be overwriten by a different condition._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| where | address | The address of the target contract to grant `_who` permission to. |
| who | address | The address (EOA or contract) to which the permission has already been granted. |
| permissionId | bytes32 | The permission identifier. |
| currentCondition | address | The current condition set for permissionId. |
| newCondition | address | The new condition it tries to set for permissionId. |

### ConditionNotAContract

```solidity
error ConditionNotAContract(contract IPermissionCondition condition)
```

Thrown if a condition address is not a contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| condition | contract IPermissionCondition | The address that is not a contract. |

### ConditionInterfaceNotSupported

```solidity
error ConditionInterfaceNotSupported(contract IPermissionCondition condition)
```

Thrown if a condition contract does not support the `IPermissionCondition` interface.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| condition | contract IPermissionCondition | The address that is not a contract. |

### PermissionsForAnyAddressDisallowed

```solidity
error PermissionsForAnyAddressDisallowed()
```

Thrown for `ROOT_PERMISSION_ID` or `EXECUTE_PERMISSION_ID` permission grants where `who` or `where` is `ANY_ADDR`.

### AnyAddressDisallowedForWhoAndWhere

```solidity
error AnyAddressDisallowedForWhoAndWhere()
```

Thrown for permission grants where `who` and `where` are both `ANY_ADDR`.

### GrantWithConditionNotSupported

```solidity
error GrantWithConditionNotSupported()
```

Thrown if `Operation.GrantWithCondition` is requested as an operation but the method does not support it.

### Granted

```solidity
event Granted(bytes32 permissionId, address here, address where, address who, address condition)
```

Emitted when a permission `permission` is granted in the context `here` to the address `_who` for the contract `_where`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| permissionId | bytes32 | The permission identifier. |
| here | address | The address of the context in which the permission is granted. |
| where | address | The address of the target contract for which `_who` receives permission. |
| who | address | The address (EOA or contract) receiving the permission. |
| condition | address | The address `ALLOW_FLAG` for regular permissions or, alternatively, the `IPermissionCondition` contract implementation to be used. |

### Revoked

```solidity
event Revoked(bytes32 permissionId, address here, address where, address who)
```

Emitted when a permission `permission` is revoked in the context `here` from the address `_who` for the contract `_where`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| permissionId | bytes32 | The permission identifier. |
| here | address | The address of the context in which the permission is revoked. |
| where | address | The address of the target contract for which `_who` loses permission. |
| who | address | The address (EOA or contract) losing the permission. |

### auth

```solidity
modifier auth(bytes32 _permissionId)
```

A modifier to make functions on inheriting contracts authorized. Permissions to call the function are checked through this permission manager.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _permissionId | bytes32 | The permission identifier required to call the method this modifier is applied to. |

### __PermissionManager_init

```solidity
function __PermissionManager_init(address _initialOwner) internal
```

Initialization method to set the initial owner of the permission manager.

_The initial owner is granted the `ROOT_PERMISSION_ID` permission._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _initialOwner | address | The initial owner of the permission manager. |

### grant

```solidity
function grant(address _where, address _who, bytes32 _permissionId) external virtual
```

Grants permission to an address to call methods in a contract guarded by an auth modifier with the specified permission identifier.

_Requires the `ROOT_PERMISSION_ID` permission.
Note, that granting permissions with `_who` or `_where` equal to `ANY_ADDR` does not replace other permissions with specific `_who` and `_where` addresses that exist in parallel._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _where | address | The address of the target contract for which `_who` receives permission. |
| _who | address | The address (EOA or contract) receiving the permission. |
| _permissionId | bytes32 | The permission identifier. |

### grantWithCondition

```solidity
function grantWithCondition(address _where, address _who, bytes32 _permissionId, contract IPermissionCondition _condition) external virtual
```

Grants permission to an address to call methods in a target contract guarded by an auth modifier with the specified permission identifier if the referenced condition permits it.

_Requires the `ROOT_PERMISSION_ID` permission
Note, that granting permissions with `_who` or `_where` equal to `ANY_ADDR` does not replace other permissions with specific `_who` and `_where` addresses that exist in parallel._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _where | address | The address of the target contract for which `_who` receives permission. |
| _who | address | The address (EOA or contract) receiving the permission. |
| _permissionId | bytes32 | The permission identifier. |
| _condition | contract IPermissionCondition | The `PermissionCondition` that will be asked for authorization on calls connected to the specified permission identifier. |

### revoke

```solidity
function revoke(address _where, address _who, bytes32 _permissionId) external virtual
```

Revokes permission from an address to call methods in a target contract guarded by an auth modifier with the specified permission identifier.

_Requires the `ROOT_PERMISSION_ID` permission.
Note, that revoking permissions with `_who` or `_where` equal to `ANY_ADDR` does not revoke other permissions with specific `_who` and `_where` addresses that exist in parallel._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _where | address | The address of the target contract for which `_who` loses permission. |
| _who | address | The address (EOA or contract) losing the permission. |
| _permissionId | bytes32 | The permission identifier. |

### applySingleTargetPermissions

```solidity
function applySingleTargetPermissions(address _where, struct PermissionLib.SingleTargetPermission[] items) external virtual
```

Applies an array of permission operations on a single target contracts `_where`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _where | address | The address of the single target contract. |
| items | struct PermissionLib.SingleTargetPermission[] | The array of single-targeted permission operations to apply. |

### applyMultiTargetPermissions

```solidity
function applyMultiTargetPermissions(struct PermissionLib.MultiTargetPermission[] _items) external virtual
```

Applies an array of permission operations on multiple target contracts `items[i].where`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _items | struct PermissionLib.MultiTargetPermission[] | The array of multi-targeted permission operations to apply. |

### isGranted

```solidity
function isGranted(address _where, address _who, bytes32 _permissionId, bytes _data) public view virtual returns (bool)
```

Checks if the caller address has permission on the target contract via a permission identifier and relays the answer to a condition contract if this was declared during the granting process.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _where | address | The address of the target contract for which `_who` receives permission. |
| _who | address | The address (EOA or contract) for which the permission is checked. |
| _permissionId | bytes32 | The permission identifier. |
| _data | bytes | Optional data to be passed to the set `PermissionCondition`. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Returns true if `_who` has the permissions on the target contract via the specified permission identifier. |

### _checkCondition

```solidity
function _checkCondition(address _condition, address _where, address _who, bytes32 _permissionId, bytes _data) internal view virtual returns (bool)
```

Relays the question if caller address has permission on target contract via a permission identifier to a condition contract.
Checks a condition contract by doing an external call via try/catch.

_If the external call fails, we return `false`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _condition | address | The condition contract that is called. |
| _where | address | The address of the target contract for which `_who` receives permission. |
| _who | address | The address (EOA or contract) owning the permission. |
| _permissionId | bytes32 | The permission identifier. |
| _data | bytes | Optional data to be passed to a referenced `PermissionCondition`. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Returns `true` if a caller (`_who`) has the permissions on the contract (`_where`) via the specified permission identifier. |

### _initializePermissionManager

```solidity
function _initializePermissionManager(address _initialOwner) internal
```

Grants the `ROOT_PERMISSION_ID` permission to the initial owner during initialization of the permission manager.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _initialOwner | address | The initial owner of the permission manager. |

### _grant

```solidity
function _grant(address _where, address _who, bytes32 _permissionId) internal virtual
```

This method is used in the external `grant` method of the permission manager.

_Note, that granting permissions with `_who` or `_where` equal to `ANY_ADDR` does not replace other permissions with specific `_who` and `_where` addresses that exist in parallel._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _where | address | The address of the target contract for which `_who` receives permission. |
| _who | address | The address (EOA or contract) owning the permission. |
| _permissionId | bytes32 | The permission identifier. |

### _grantWithCondition

```solidity
function _grantWithCondition(address _where, address _who, bytes32 _permissionId, contract IPermissionCondition _condition) internal virtual
```

This method is used in the external `grantWithCondition` method of the permission manager.

_Note, that granting permissions with `_who` or `_where` equal to `ANY_ADDR` does not replace other permissions with specific `_who` and `_where` addresses that exist in parallel._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _where | address | The address of the target contract for which `_who` receives permission. |
| _who | address | The address (EOA or contract) owning the permission. |
| _permissionId | bytes32 | The permission identifier. |
| _condition | contract IPermissionCondition | An address either resolving to a `PermissionCondition` contract address or being the `ALLOW_FLAG` address (`address(2)`). |

### _revoke

```solidity
function _revoke(address _where, address _who, bytes32 _permissionId) internal virtual
```

This method is used in the public `revoke` method of the permission manager.

_Note, that revoking permissions with `_who` or `_where` equal to `ANY_ADDR` does not revoke other permissions with specific `_who` and `_where` addresses that might have been granted in parallel._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _where | address | The address of the target contract for which `_who` receives permission. |
| _who | address | The address (EOA or contract) owning the permission. |
| _permissionId | bytes32 | The permission identifier. |

### _auth

```solidity
function _auth(bytes32 _permissionId) internal view virtual
```

A private function to be used to check permissions on the permission manager contract (`address(this)`) itself.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _permissionId | bytes32 | The permission identifier required to call the method this modifier is applied to. |

### permissionHash

```solidity
function permissionHash(address _where, address _who, bytes32 _permissionId) internal pure virtual returns (bytes32)
```

Generates the hash for the `permissionsHashed` mapping obtained from the word "PERMISSION", the contract address, the address owning the permission, and the permission identifier.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _where | address | The address of the target contract for which `_who` receives permission. |
| _who | address | The address (EOA or contract) owning the permission. |
| _permissionId | bytes32 | The permission identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | The permission hash. |

### isPermissionRestrictedForAnyAddr

```solidity
function isPermissionRestrictedForAnyAddr(bytes32 _permissionId) internal view virtual returns (bool)
```

Decides if the granting permissionId is restricted when `_who == ANY_ADDR` or `_where == ANY_ADDR`.

_By default, every permission is unrestricted and it is the derived contract's responsibility to override it. Note, that the `ROOT_PERMISSION_ID` is included and not required to be set it again._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _permissionId | bytes32 | The permission identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not the permission is restricted. |

## CallbackHandler

This contract handles callbacks by registering a magic number together with the callback function's selector. It provides the `_handleCallback` function that inheriting contracts have to call inside their `fallback()` function  (`_handleCallback(msg.callbackSelector, msg.data)`).  This allows to adaptively register ERC standards (e.g., [ERC-721](https://eips.ethereum.org/EIPS/eip-721), [ERC-1115](https://eips.ethereum.org/EIPS/eip-1155), or future versions of [ERC-165](https://eips.ethereum.org/EIPS/eip-165)) and returning the required magic numbers for the associated callback functions for the inheriting contract so that it doesn't need to be upgraded.

_This callback handling functionality is intended to be used by executor contracts (i.e., `DAO.sol`)._

### callbackMagicNumbers

```solidity
mapping(bytes4 => bytes4) callbackMagicNumbers
```

A mapping between callback function selectors and magic return numbers.

### UNREGISTERED_CALLBACK

```solidity
bytes4 UNREGISTERED_CALLBACK
```

The magic number refering to unregistered callbacks.

### UnknownCallback

```solidity
error UnknownCallback(bytes4 callbackSelector, bytes4 magicNumber)
```

Thrown if the callback function is not registered.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| callbackSelector | bytes4 | The selector of the callback function. |
| magicNumber | bytes4 | The magic number to be registered for the callback function selector. |

### CallbackReceived

```solidity
event CallbackReceived(address sender, bytes4 sig, bytes data)
```

Emitted when `_handleCallback` is called.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | Who called the callback. |
| sig | bytes4 | The function signature. |
| data | bytes | The calldata. |

### _handleCallback

```solidity
function _handleCallback(bytes4 _callbackSelector, bytes _data) internal virtual returns (bytes4)
```

Handles callbacks to adaptively support ERC standards.

_This function is supposed to be called via `_handleCallback(msg.sig, msg.data)` in the `fallback()` function of the inheriting contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _callbackSelector | bytes4 | The function selector of the callback function. |
| _data | bytes | The calldata. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes4 | The magic number registered for the function selector triggering the fallback. |

### _registerCallback

```solidity
function _registerCallback(bytes4 _callbackSelector, bytes4 _magicNumber) internal virtual
```

Registers a magic number for a callback function selector.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _callbackSelector | bytes4 | The selector of the callback function. |
| _magicNumber | bytes4 | The magic number to be registered for the callback function selector. |

## DAOFactory

This contract is used to create a DAO.

### daoBase

```solidity
address daoBase
```

The DAO base contract, to be used for creating new `DAO`s via `createERC1967Proxy` function.

### daoRegistry

```solidity
contract DAORegistry daoRegistry
```

The DAO registry listing the `DAO` contracts created via this contract.

### pluginSetupProcessor

```solidity
contract PluginSetupProcessor pluginSetupProcessor
```

The plugin setup processor for installing plugins on the newly created `DAO`s.

### ROOT_PERMISSION_ID

```solidity
bytes32 ROOT_PERMISSION_ID
```

### UPGRADE_DAO_PERMISSION_ID

```solidity
bytes32 UPGRADE_DAO_PERMISSION_ID
```

### SET_TRUSTED_FORWARDER_PERMISSION_ID

```solidity
bytes32 SET_TRUSTED_FORWARDER_PERMISSION_ID
```

### SET_METADATA_PERMISSION_ID

```solidity
bytes32 SET_METADATA_PERMISSION_ID
```

### REGISTER_STANDARD_CALLBACK_PERMISSION_ID

```solidity
bytes32 REGISTER_STANDARD_CALLBACK_PERMISSION_ID
```

### EXECUTE_PERMISSION_ID

```solidity
bytes32 EXECUTE_PERMISSION_ID
```

### APPLY_INSTALLATION_PERMISSION_ID

```solidity
bytes32 APPLY_INSTALLATION_PERMISSION_ID
```

### DAOSettings

```solidity
struct DAOSettings {
  address trustedForwarder;
  string daoURI;
  string subdomain;
  bytes metadata;
}
```

### PluginSettings

```solidity
struct PluginSettings {
  struct PluginSetupRef pluginSetupRef;
  bytes data;
}
```

### InstalledPlugin

```solidity
struct InstalledPlugin {
  address plugin;
  struct IPluginSetup.PreparedSetupData preparedSetupData;
}
```

### NoPluginProvided

```solidity
error NoPluginProvided()
```

Thrown if `PluginSettings` array is empty, and no plugin is provided.

### constructor

```solidity
constructor(contract DAORegistry _registry, contract PluginSetupProcessor _pluginSetupProcessor) public
```

The constructor setting the registry and plugin setup processor and creating the base contracts for the factory.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _registry | contract DAORegistry | The DAO registry to register the DAO by its name. |
| _pluginSetupProcessor | contract PluginSetupProcessor | The address of PluginSetupProcessor. |

### supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view virtual returns (bool)
```

Checks if this or the parent contract supports an interface by its ID.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _interfaceId | bytes4 | The ID of the interface. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Returns `true` if the interface is supported. |

### createDao

```solidity
function createDao(struct DAOFactory.DAOSettings _daoSettings, struct DAOFactory.PluginSettings[] _pluginSettings) external returns (contract DAO createdDao, struct DAOFactory.InstalledPlugin[] installedPlugins)
```

Creates a new DAO, registers it in the DAO registry, and optionally installs plugins via the plugin setup processor.

_If `_pluginSettings` is empty, the caller is granted `EXECUTE_PERMISSION` on the DAO._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _daoSettings | struct DAOFactory.DAOSettings | The settings to configure during DAO initialization. |
| _pluginSettings | struct DAOFactory.PluginSettings[] | An array containing plugin references and settings. If provided, each plugin is installed after the DAO creation. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| createdDao | contract DAO | The address of the newly created DAO instance. |
| installedPlugins | struct DAOFactory.InstalledPlugin[] | An array of `InstalledPlugin` structs, each containing the plugin address and associated helper contracts and permissions, if plugins were installed; otherwise, an empty array. |

### _createDAO

```solidity
function _createDAO(struct DAOFactory.DAOSettings _daoSettings) internal returns (contract DAO dao)
```

Deploys a new DAO `ERC1967` proxy, and initialize it with this contract as the initial owner.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _daoSettings | struct DAOFactory.DAOSettings | The trusted forwarder, name and metadata hash of the DAO it creates. |

### _setDAOPermissions

```solidity
function _setDAOPermissions(address _daoAddress) internal
```

Sets the required permissions for the new DAO.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _daoAddress | address | The address of the DAO just created. |

## DAORegistry

This contract provides the possibility to register a DAO.

### REGISTER_DAO_PERMISSION_ID

```solidity
bytes32 REGISTER_DAO_PERMISSION_ID
```

The ID of the permission required to call the `register` function.

### subdomainRegistrar

```solidity
contract ENSSubdomainRegistrar subdomainRegistrar
```

The ENS subdomain registrar registering the DAO subdomains.

### InvalidDaoSubdomain

```solidity
error InvalidDaoSubdomain(string subdomain)
```

Thrown if the DAO subdomain doesn't match the regex `[0-9a-z\-]`

### DAORegistered

```solidity
event DAORegistered(address dao, address creator, string subdomain)
```

Emitted when a new DAO is registered.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dao | address | The address of the DAO contract. |
| creator | address | The address of the creator. |
| subdomain | string | The DAO subdomain. |

### constructor

```solidity
constructor() public
```

_Used to disallow initializing the implementation contract by an attacker for extra safety._

### initialize

```solidity
function initialize(contract IDAO _managingDao, contract ENSSubdomainRegistrar _subdomainRegistrar) external
```

Initializes the contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _managingDao | contract IDAO | the managing DAO address. |
| _subdomainRegistrar | contract ENSSubdomainRegistrar | The `ENSSubdomainRegistrar` where `ENS` subdomain will be registered. |

### register

```solidity
function register(contract IDAO dao, address creator, string subdomain) external
```

Registers a DAO by its address. If a non-empty subdomain name is provided that is not taken already, the DAO becomes the owner of the ENS name.

_A subdomain is unique within the Aragon DAO framework and can get stored here._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dao | contract IDAO | The address of the DAO contract. |
| creator | address | The address of the creator. |
| subdomain | string | The DAO subdomain. |

## IPluginRepo

The interface required for a plugin repository.

### updateReleaseMetadata

```solidity
function updateReleaseMetadata(uint8 _release, bytes _releaseMetadata) external
```

Updates the metadata for release with content `@fromHex(_releaseMetadata)`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _release | uint8 | The release number. |
| _releaseMetadata | bytes | The release metadata URI. |

### createVersion

```solidity
function createVersion(uint8 _release, address _pluginSetupAddress, bytes _buildMetadata, bytes _releaseMetadata) external
```

Creates a new plugin version as the latest build for an existing release number or the first build for a new release number for the provided `PluginSetup` contract address and metadata.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _release | uint8 | The release number. |
| _pluginSetupAddress | address | The address of the plugin setup contract. |
| _buildMetadata | bytes | The build metadata URI. |
| _releaseMetadata | bytes | The release metadata URI. |

### VersionCreated

```solidity
event VersionCreated(uint8 release, uint16 build, address pluginSetup, bytes buildMetadata)
```

Emitted if the same plugin setup exists in previous releases.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| release | uint8 | The release number. |
| build | uint16 | The build number. |
| pluginSetup | address | The address of the plugin setup contract. |
| buildMetadata | bytes | The build metadata URI. |

### ReleaseMetadataUpdated

```solidity
event ReleaseMetadataUpdated(uint8 release, bytes releaseMetadata)
```

Emitted when a release's metadata was updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| release | uint8 | The release number. |
| releaseMetadata | bytes | The release metadata URI. |

## PluginRepo

The plugin repository contract required for managing and publishing different plugin versions within the Aragon DAO framework.

### Tag

```solidity
struct Tag {
  uint8 release;
  uint16 build;
}
```

### Version

```solidity
struct Version {
  struct PluginRepo.Tag tag;
  address pluginSetup;
  bytes buildMetadata;
}
```

### MAINTAINER_PERMISSION_ID

```solidity
bytes32 MAINTAINER_PERMISSION_ID
```

The ID of the permission required to call the `createVersion` function.

### UPGRADE_REPO_PERMISSION_ID

```solidity
bytes32 UPGRADE_REPO_PERMISSION_ID
```

The ID of the permission required to call the `createVersion` function.

### buildsPerRelease

```solidity
mapping(uint8 => uint16) buildsPerRelease
```

The mapping between release and build numbers.

### versions

```solidity
mapping(bytes32 => struct PluginRepo.Version) versions
```

The mapping between the version hash and the corresponding version information.

### latestTagHashForPluginSetup

```solidity
mapping(address => bytes32) latestTagHashForPluginSetup
```

The mapping between the plugin setup address and its corresponding version hash.

### latestRelease

```solidity
uint8 latestRelease
```

The ID of the latest release.

_The maximum release number is 255._

### VersionHashDoesNotExist

```solidity
error VersionHashDoesNotExist(bytes32 versionHash)
```

Thrown if a version does not exist.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| versionHash | bytes32 | The tag hash. |

### InvalidPluginSetupInterface

```solidity
error InvalidPluginSetupInterface()
```

Thrown if a plugin setup contract does not inherit from `PluginSetup`.

### ReleaseZeroNotAllowed

```solidity
error ReleaseZeroNotAllowed()
```

Thrown if a release number is zero.

### InvalidReleaseIncrement

```solidity
error InvalidReleaseIncrement(uint8 latestRelease, uint8 newRelease)
```

Thrown if a release number is incremented by more than one.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| latestRelease | uint8 | The latest release number. |
| newRelease | uint8 | The new release number. |

### PluginSetupAlreadyInPreviousRelease

```solidity
error PluginSetupAlreadyInPreviousRelease(uint8 release, uint16 build, address pluginSetup)
```

Thrown if the same plugin setup contract exists already in a previous releases.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| release | uint8 | The release number of the already existing plugin setup. |
| build | uint16 | The build number of the already existing plugin setup. |
| pluginSetup | address | The plugin setup contract address. |

### EmptyReleaseMetadata

```solidity
error EmptyReleaseMetadata()
```

Thrown if the metadata URI is empty.

### ReleaseDoesNotExist

```solidity
error ReleaseDoesNotExist()
```

Thrown if release does not exist.

### constructor

```solidity
constructor() public
```

_Used to disallow initializing the implementation contract by an attacker for extra safety._

### initialize

```solidity
function initialize(address initialOwner) external
```

Initializes the contract by
- initializing the permission manager
- granting the `MAINTAINER_PERMISSION_ID` permission to the initial owner.

_This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)._

### initializeFrom

```solidity
function initializeFrom(uint8[3] _previousProtocolVersion, bytes _initData) external
```

Initializes the pluginRepo after an upgrade from a previous protocol version.

_This function is a placeholder until we require reinitialization._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _previousProtocolVersion | uint8[3] | The semantic protocol version number of the previous DAO implementation contract this upgrade is transitioning from. |
| _initData | bytes | The initialization data to be passed to via `upgradeToAndCall` (see [ERC-1967](https://docs.openzeppelin.com/contracts/4.x/api/proxy#ERC1967Upgrade)). |

### createVersion

```solidity
function createVersion(uint8 _release, address _pluginSetup, bytes _buildMetadata, bytes _releaseMetadata) external
```

Creates a new plugin version as the latest build for an existing release number or the first build for a new release number for the provided `PluginSetup` contract address and metadata.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _release | uint8 | The release number. |
| _pluginSetup | address |  |
| _buildMetadata | bytes | The build metadata URI. |
| _releaseMetadata | bytes | The release metadata URI. |

### updateReleaseMetadata

```solidity
function updateReleaseMetadata(uint8 _release, bytes _releaseMetadata) external
```

Updates the metadata for release with content `@fromHex(_releaseMetadata)`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _release | uint8 | The release number. |
| _releaseMetadata | bytes | The release metadata URI. |

### getLatestVersion

```solidity
function getLatestVersion(uint8 _release) public view returns (struct PluginRepo.Version)
```

Returns the latest version for a given release number.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _release | uint8 | The release number. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct PluginRepo.Version | The latest version of this release. |

### getLatestVersion

```solidity
function getLatestVersion(address _pluginSetup) public view returns (struct PluginRepo.Version)
```

Returns the latest version for a given plugin setup.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _pluginSetup | address | The plugin setup address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct PluginRepo.Version | The latest version associated with the plugin Setup. |

### getVersion

```solidity
function getVersion(struct PluginRepo.Tag _tag) public view returns (struct PluginRepo.Version)
```

Returns the version associated with a tag.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tag | struct PluginRepo.Tag | The version tag. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct PluginRepo.Version | The version associated with the tag. |

### getVersion

```solidity
function getVersion(bytes32 _tagHash) public view returns (struct PluginRepo.Version)
```

Returns the version for a tag hash.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tagHash | bytes32 | The tag hash. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct PluginRepo.Version | The version associated with a tag hash. |

### buildCount

```solidity
function buildCount(uint8 _release) public view returns (uint256)
```

Gets the total number of builds for a given release number.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _release | uint8 | The release number. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of builds of this release. |

### tagHash

```solidity
function tagHash(struct PluginRepo.Tag _tag) internal pure returns (bytes32)
```

The hash of the version tag obtained from the packed, bytes-encoded release and build number.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tag | struct PluginRepo.Tag | The version tag. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | The version tag hash. |

### _authorizeUpgrade

```solidity
function _authorizeUpgrade(address) internal virtual
```

Internal method authorizing the upgrade of the contract via the [upgradeability mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).

_The caller must have the `UPGRADE_REPO_PERMISSION_ID` permission._

### supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view virtual returns (bool)
```

Checks if this or the parent contract supports an interface by its ID.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _interfaceId | bytes4 | The ID of the interface. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Returns `true` if the interface is supported. |

## PluginRepoFactory

This contract creates `PluginRepo` proxies and registers them on a `PluginRepoRegistry` contract.

### pluginRepoRegistry

```solidity
contract PluginRepoRegistry pluginRepoRegistry
```

The Aragon plugin registry contract.

### pluginRepoBase

```solidity
address pluginRepoBase
```

The address of the `PluginRepo` base contract to proxy to..

### constructor

```solidity
constructor(contract PluginRepoRegistry _pluginRepoRegistry) public
```

Initializes the addresses of the Aragon plugin registry and `PluginRepo` base contract to proxy to.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _pluginRepoRegistry | contract PluginRepoRegistry | The aragon plugin registry address. |

### supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view virtual returns (bool)
```

Checks if this or the parent contract supports an interface by its ID.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _interfaceId | bytes4 | The ID of the interface. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Returns `true` if the interface is supported. |

### createPluginRepo

```solidity
function createPluginRepo(string _subdomain, address _initialOwner) external returns (contract PluginRepo)
```

Creates a plugin repository proxy pointing to the `pluginRepoBase` implementation and registers it in the Aragon plugin registry.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _subdomain | string | The plugin repository subdomain. |
| _initialOwner | address | The plugin maintainer address. |

### createPluginRepoWithFirstVersion

```solidity
function createPluginRepoWithFirstVersion(string _subdomain, address _pluginSetup, address _maintainer, bytes _releaseMetadata, bytes _buildMetadata) external returns (contract PluginRepo pluginRepo)
```

Creates and registers a `PluginRepo` with an ENS subdomain and publishes an initial version `1.1`.

_After the creation of the `PluginRepo` and release of the first version by the factory, ownership is transferred to the `_maintainer` address._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _subdomain | string | The plugin repository subdomain. |
| _pluginSetup | address | The plugin factory contract associated with the plugin version. |
| _maintainer | address | The maintainer of the plugin repo. This address has permission to update metadata, upgrade the repo logic, and manage the repo permissions. |
| _releaseMetadata | bytes | The release metadata URI. |
| _buildMetadata | bytes | The build metadata URI. |

### _setPluginRepoPermissions

```solidity
function _setPluginRepoPermissions(contract PluginRepo pluginRepo, address maintainer) internal
```

Set the final permissions for the published plugin repository maintainer. All permissions are revoked from the plugin factory and granted to the specified plugin maintainer.

_The plugin maintainer is granted the `MAINTAINER_PERMISSION_ID`, `UPGRADE_REPO_PERMISSION_ID`, and `ROOT_PERMISSION_ID`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| pluginRepo | contract PluginRepo | The plugin repository instance just created. |
| maintainer | address | The plugin maintainer address. |

### _createPluginRepo

```solidity
function _createPluginRepo(string _subdomain, address _initialOwner) internal returns (contract PluginRepo pluginRepo)
```

Internal method creating a `PluginRepo` via the [ERC-1967](https://eips.ethereum.org/EIPS/eip-1967) proxy pattern from the provided base contract and registering it in the Aragon plugin registry.

_Passing an empty `_subdomain` will cause the transaction to revert._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _subdomain | string | The plugin repository subdomain. |
| _initialOwner | address | The initial owner address. |

## PluginRepoRegistry

This contract maintains an address-based registry of plugin repositories in the Aragon App DAO framework.

### REGISTER_PLUGIN_REPO_PERMISSION_ID

```solidity
bytes32 REGISTER_PLUGIN_REPO_PERMISSION_ID
```

The ID of the permission required to call the `register` function.

### subdomainRegistrar

```solidity
contract ENSSubdomainRegistrar subdomainRegistrar
```

The ENS subdomain registrar registering the PluginRepo subdomains.

### PluginRepoRegistered

```solidity
event PluginRepoRegistered(string subdomain, address pluginRepo)
```

Emitted if a new plugin repository is registered.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| subdomain | string | The subdomain of the plugin repository. |
| pluginRepo | address | The address of the plugin repository. |

### InvalidPluginSubdomain

```solidity
error InvalidPluginSubdomain(string subdomain)
```

Thrown if the plugin subdomain doesn't match the regex `[0-9a-z\-]`

### EmptyPluginRepoSubdomain

```solidity
error EmptyPluginRepoSubdomain()
```

Thrown if the plugin repository subdomain is empty.

### constructor

```solidity
constructor() public
```

_Used to disallow initializing the implementation contract by an attacker for extra safety._

### initialize

```solidity
function initialize(contract IDAO _dao, contract ENSSubdomainRegistrar _subdomainRegistrar) external
```

Initializes the contract by setting calling the `InterfaceBasedRegistry` base class initialize method.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dao | contract IDAO | The address of the managing DAO. |
| _subdomainRegistrar | contract ENSSubdomainRegistrar | The `ENSSubdomainRegistrar` where `ENS` subdomain will be registered. |

### registerPluginRepo

```solidity
function registerPluginRepo(string subdomain, address pluginRepo) external
```

Registers a plugin repository with a subdomain and address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| subdomain | string | The subdomain of the PluginRepo. |
| pluginRepo | address | The address of the PluginRepo contract. |

## PlaceholderSetup

A placeholder setup contract for outdated plugin builds. When moving plugin repos to new chains or layers, where only the latest release and build should be available, this placeholder can be used to populate previous builds.

### PlaceholderSetupCannotBeUsed

```solidity
error PlaceholderSetupCannotBeUsed()
```

Thrown if the dummy is used.

### constructor

```solidity
constructor() public
```

### prepareInstallation

```solidity
function prepareInstallation(address, bytes) external pure returns (address, struct IPluginSetup.PreparedSetupData)
```

Prepares the installation of a plugin.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
|  | address |  |
|  | bytes |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address |  |
| [1] | struct IPluginSetup.PreparedSetupData |  |

### prepareUninstallation

```solidity
function prepareUninstallation(address, struct IPluginSetup.SetupPayload) external pure returns (struct PermissionLib.MultiTargetPermission[])
```

Prepares the uninstallation of a plugin.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
|  | address |  |
|  | struct IPluginSetup.SetupPayload |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct PermissionLib.MultiTargetPermission[] |  |

## PluginSetupProcessor

This contract processes the preparation and application of plugin setups (installation, update, uninstallation) on behalf of a requesting DAO.

_This contract is temporarily granted the `ROOT_PERMISSION_ID` permission on the applying DAO and therefore is highly security critical._

### APPLY_INSTALLATION_PERMISSION_ID

```solidity
bytes32 APPLY_INSTALLATION_PERMISSION_ID
```

The ID of the permission required to call the `applyInstallation` function.

### APPLY_UPDATE_PERMISSION_ID

```solidity
bytes32 APPLY_UPDATE_PERMISSION_ID
```

The ID of the permission required to call the `applyUpdate` function.

### APPLY_UNINSTALLATION_PERMISSION_ID

```solidity
bytes32 APPLY_UNINSTALLATION_PERMISSION_ID
```

The ID of the permission required to call the `applyUninstallation` function.

### PluginState

```solidity
struct PluginState {
  uint256 blockNumber;
  bytes32 currentAppliedSetupId;
  mapping(bytes32 => uint256) preparedSetupIdToBlockNumber;
}
```

### states

```solidity
mapping(bytes32 => struct PluginSetupProcessor.PluginState) states
```

A mapping between the plugin installation ID (obtained from the DAO and plugin address) and the plugin state information.

_This variable is public on purpose to allow future versions to access and migrate the storage._

### PrepareInstallationParams

```solidity
struct PrepareInstallationParams {
  struct PluginSetupRef pluginSetupRef;
  bytes data;
}
```

### ApplyInstallationParams

```solidity
struct ApplyInstallationParams {
  struct PluginSetupRef pluginSetupRef;
  address plugin;
  struct PermissionLib.MultiTargetPermission[] permissions;
  bytes32 helpersHash;
}
```

### PrepareUpdateParams

```solidity
struct PrepareUpdateParams {
  struct PluginRepo.Tag currentVersionTag;
  struct PluginRepo.Tag newVersionTag;
  contract PluginRepo pluginSetupRepo;
  struct IPluginSetup.SetupPayload setupPayload;
}
```

### ApplyUpdateParams

```solidity
struct ApplyUpdateParams {
  address plugin;
  struct PluginSetupRef pluginSetupRef;
  bytes initData;
  struct PermissionLib.MultiTargetPermission[] permissions;
  bytes32 helpersHash;
}
```

### PrepareUninstallationParams

```solidity
struct PrepareUninstallationParams {
  struct PluginSetupRef pluginSetupRef;
  struct IPluginSetup.SetupPayload setupPayload;
}
```

### ApplyUninstallationParams

```solidity
struct ApplyUninstallationParams {
  address plugin;
  struct PluginSetupRef pluginSetupRef;
  struct PermissionLib.MultiTargetPermission[] permissions;
}
```

### repoRegistry

```solidity
contract PluginRepoRegistry repoRegistry
```

The plugin repo registry listing the `PluginRepo` contracts versioning the `PluginSetup` contracts.

### SetupApplicationUnauthorized

```solidity
error SetupApplicationUnauthorized(address dao, address caller, bytes32 permissionId)
```

Thrown if a setup is unauthorized and cannot be applied because of a missing permission of the associated DAO.

_This is thrown if the `APPLY_INSTALLATION_PERMISSION_ID`, `APPLY_UPDATE_PERMISSION_ID`, or APPLY_UNINSTALLATION_PERMISSION_ID is missing._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dao | address | The address of the DAO to which the plugin belongs. |
| caller | address | The address (EOA or contract) that requested the application of a setup on the associated DAO. |
| permissionId | bytes32 | The permission identifier. |

### PluginNonupgradeable

```solidity
error PluginNonupgradeable(address plugin)
```

Thrown if a plugin is not upgradeable.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| plugin | address | The address of the plugin contract. |

### PluginProxyUpgradeFailed

```solidity
error PluginProxyUpgradeFailed(address proxy, address implementation, bytes initData)
```

Thrown if the upgrade of an `UUPSUpgradeable` proxy contract (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)) failed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proxy | address | The address of the proxy. |
| implementation | address | The address of the implementation contract. |
| initData | bytes | The initialization data to be passed to the upgradeable plugin contract via `upgradeToAndCall`. |

### IPluginNotSupported

```solidity
error IPluginNotSupported(address plugin)
```

Thrown if a contract does not support the `IPlugin` interface.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| plugin | address | The address of the contract. |

### PluginRepoNonexistent

```solidity
error PluginRepoNonexistent()
```

Thrown if a plugin repository does not exist on the plugin repo registry.

### SetupAlreadyPrepared

```solidity
error SetupAlreadyPrepared(bytes32 preparedSetupId)
```

Thrown if a plugin setup was already prepared indicated by the prepared setup ID.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| preparedSetupId | bytes32 | The prepared setup ID. |

### SetupNotApplicable

```solidity
error SetupNotApplicable(bytes32 preparedSetupId)
```

Thrown if a prepared setup ID is not eligible to be applied. This can happen if another setup has been already applied or if the setup wasn't prepared in the first place.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| preparedSetupId | bytes32 | The prepared setup ID. |

### InvalidUpdateVersion

```solidity
error InvalidUpdateVersion(struct PluginRepo.Tag currentVersionTag, struct PluginRepo.Tag newVersionTag)
```

Thrown if the update version is invalid.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currentVersionTag | struct PluginRepo.Tag | The tag of the current version to update from. |
| newVersionTag | struct PluginRepo.Tag | The tag of the new version to update to. |

### PluginAlreadyInstalled

```solidity
error PluginAlreadyInstalled()
```

Thrown if plugin is already installed and one tries to prepare or apply install on it.

### InvalidAppliedSetupId

```solidity
error InvalidAppliedSetupId(bytes32 currentAppliedSetupId, bytes32 appliedSetupId)
```

Thrown if the applied setup ID resulting from the supplied setup payload does not match with the current applied setup ID.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currentAppliedSetupId | bytes32 | The current applied setup ID with which the data in the supplied payload must match. |
| appliedSetupId | bytes32 | The applied setup ID obtained from the data in the supplied setup payload. |

### InstallationPrepared

```solidity
event InstallationPrepared(address sender, address dao, bytes32 preparedSetupId, contract PluginRepo pluginSetupRepo, struct PluginRepo.Tag versionTag, bytes data, address plugin, struct IPluginSetup.PreparedSetupData preparedSetupData)
```

Emitted with a prepared plugin installation to store data relevant for the application step.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | The sender that prepared the plugin installation. |
| dao | address | The address of the DAO to which the plugin belongs. |
| preparedSetupId | bytes32 | The prepared setup ID obtained from the supplied data. |
| pluginSetupRepo | contract PluginRepo | The repository storing the `PluginSetup` contracts of all versions of a plugin. |
| versionTag | struct PluginRepo.Tag | The version tag of the plugin setup of the prepared installation. |
| data | bytes | The bytes-encoded data containing the input parameters for the preparation as specified in the corresponding ABI on the version's metadata. |
| plugin | address | The address of the plugin contract. |
| preparedSetupData | struct IPluginSetup.PreparedSetupData | The deployed plugin's relevant data which consists of helpers and permissions. |

### InstallationApplied

```solidity
event InstallationApplied(address dao, address plugin, bytes32 preparedSetupId, bytes32 appliedSetupId)
```

Emitted after a plugin installation was applied.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dao | address | The address of the DAO to which the plugin belongs. |
| plugin | address | The address of the plugin contract. |
| preparedSetupId | bytes32 | The prepared setup ID. |
| appliedSetupId | bytes32 | The applied setup ID. |

### UpdatePrepared

```solidity
event UpdatePrepared(address sender, address dao, bytes32 preparedSetupId, contract PluginRepo pluginSetupRepo, struct PluginRepo.Tag versionTag, struct IPluginSetup.SetupPayload setupPayload, struct IPluginSetup.PreparedSetupData preparedSetupData, bytes initData)
```

Emitted with a prepared plugin update to store data relevant for the application step.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | The sender that prepared the plugin update. |
| dao | address | The address of the DAO to which the plugin belongs. |
| preparedSetupId | bytes32 | The prepared setup ID. |
| pluginSetupRepo | contract PluginRepo | The repository storing the `PluginSetup` contracts of all versions of a plugin. |
| versionTag | struct PluginRepo.Tag | The version tag of the plugin setup of the prepared update. |
| setupPayload | struct IPluginSetup.SetupPayload | The payload containing the plugin and helper contract addresses deployed in a preparation step as well as optional data to be consumed by the plugin setup. |
| preparedSetupData | struct IPluginSetup.PreparedSetupData | The deployed plugin's relevant data which consists of helpers and permissions. |
| initData | bytes | The initialization data to be passed to the upgradeable plugin contract. |

### UpdateApplied

```solidity
event UpdateApplied(address dao, address plugin, bytes32 preparedSetupId, bytes32 appliedSetupId)
```

Emitted after a plugin update was applied.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dao | address | The address of the DAO to which the plugin belongs. |
| plugin | address | The address of the plugin contract. |
| preparedSetupId | bytes32 | The prepared setup ID. |
| appliedSetupId | bytes32 | The applied setup ID. |

### UninstallationPrepared

```solidity
event UninstallationPrepared(address sender, address dao, bytes32 preparedSetupId, contract PluginRepo pluginSetupRepo, struct PluginRepo.Tag versionTag, struct IPluginSetup.SetupPayload setupPayload, struct PermissionLib.MultiTargetPermission[] permissions)
```

Emitted with a prepared plugin uninstallation to store data relevant for the application step.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | The sender that prepared the plugin uninstallation. |
| dao | address | The address of the DAO to which the plugin belongs. |
| preparedSetupId | bytes32 | The prepared setup ID. |
| pluginSetupRepo | contract PluginRepo | The repository storing the `PluginSetup` contracts of all versions of a plugin. |
| versionTag | struct PluginRepo.Tag | The version tag of the plugin to used for install preparation. |
| setupPayload | struct IPluginSetup.SetupPayload | The payload containing the plugin and helper contract addresses deployed in a preparation step as well as optional data to be consumed by the plugin setup. |
| permissions | struct PermissionLib.MultiTargetPermission[] | The list of multi-targeted permission operations to be applied to the installing DAO. |

### UninstallationApplied

```solidity
event UninstallationApplied(address dao, address plugin, bytes32 preparedSetupId)
```

Emitted after a plugin installation was applied.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dao | address | The address of the DAO to which the plugin belongs. |
| plugin | address | The address of the plugin contract. |
| preparedSetupId | bytes32 | The prepared setup ID. |

### canApply

```solidity
modifier canApply(address _dao, bytes32 _permissionId)
```

A modifier to check if a caller has the permission to apply a prepared setup.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dao | address | The address of the DAO. |
| _permissionId | bytes32 | The permission identifier. |

### constructor

```solidity
constructor(contract PluginRepoRegistry _repoRegistry) public
```

Constructs the plugin setup processor by setting the associated plugin repo registry.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _repoRegistry | contract PluginRepoRegistry | The plugin repo registry contract. |

### prepareInstallation

```solidity
function prepareInstallation(address _dao, struct PluginSetupProcessor.PrepareInstallationParams _params) external returns (address plugin, struct IPluginSetup.PreparedSetupData preparedSetupData)
```

Prepares the installation of a plugin.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dao | address | The address of the installing DAO. |
| _params | struct PluginSetupProcessor.PrepareInstallationParams | The struct containing the parameters for the `prepareInstallation` function. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| plugin | address | The prepared plugin contract address. |
| preparedSetupData | struct IPluginSetup.PreparedSetupData | The data struct containing the array of helper contracts and permissions that the setup has prepared. |

### applyInstallation

```solidity
function applyInstallation(address _dao, struct PluginSetupProcessor.ApplyInstallationParams _params) external
```

Applies the permissions of a prepared installation to a DAO.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dao | address | The address of the installing DAO. |
| _params | struct PluginSetupProcessor.ApplyInstallationParams | The struct containing the parameters for the `applyInstallation` function. |

### prepareUpdate

```solidity
function prepareUpdate(address _dao, struct PluginSetupProcessor.PrepareUpdateParams _params) external returns (bytes initData, struct IPluginSetup.PreparedSetupData preparedSetupData)
```

Prepares the update of an UUPS upgradeable plugin.

_The list of `_params.setupPayload.currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happened) on which the update is prepared for._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dao | address | The address of the DAO For which preparation of update happens. |
| _params | struct PluginSetupProcessor.PrepareUpdateParams | The struct containing the parameters for the `prepareUpdate` function. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| initData | bytes | The initialization data to be passed to upgradeable contracts when the update is applied |
| preparedSetupData | struct IPluginSetup.PreparedSetupData | The data struct containing the array of helper contracts and permissions that the setup has prepared. |

### applyUpdate

```solidity
function applyUpdate(address _dao, struct PluginSetupProcessor.ApplyUpdateParams _params) external
```

Applies the permissions of a prepared update of an UUPS upgradeable proxy contract to a DAO.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dao | address | The address of the updating DAO. |
| _params | struct PluginSetupProcessor.ApplyUpdateParams | The struct containing the parameters for the `applyUpdate` function. |

### prepareUninstallation

```solidity
function prepareUninstallation(address _dao, struct PluginSetupProcessor.PrepareUninstallationParams _params) external returns (struct PermissionLib.MultiTargetPermission[] permissions)
```

Prepares the uninstallation of a plugin.

_The list of `_params.setupPayload.currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happened) on which the uninstallation was prepared for._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dao | address | The address of the uninstalling DAO. |
| _params | struct PluginSetupProcessor.PrepareUninstallationParams | The struct containing the parameters for the `prepareUninstallation` function. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| permissions | struct PermissionLib.MultiTargetPermission[] | The list of multi-targeted permission operations to be applied to the uninstalling DAO. |

### applyUninstallation

```solidity
function applyUninstallation(address _dao, struct PluginSetupProcessor.ApplyUninstallationParams _params) external
```

Applies the permissions of a prepared uninstallation to a DAO.

_The list of `_params.setupPayload.currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happened) on which the uninstallation was prepared for._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dao | address | The address of the DAO. |
| _params | struct PluginSetupProcessor.ApplyUninstallationParams | The struct containing the parameters for the `applyUninstallation` function. |

### validatePreparedSetupId

```solidity
function validatePreparedSetupId(bytes32 pluginInstallationId, bytes32 preparedSetupId) public view
```

Validates that a setup ID can be applied for `applyInstallation`, `applyUpdate`, or `applyUninstallation`.

_If the block number stored in `states[pluginInstallationId].blockNumber` exceeds the one stored in `pluginState.preparedSetupIdToBlockNumber[preparedSetupId]`, the prepared setup with `preparedSetupId` is outdated and not applicable anymore._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| pluginInstallationId | bytes32 | The plugin installation ID obtained from the hash of `abi.encode(daoAddress, pluginAddress)`. |
| preparedSetupId | bytes32 | The prepared setup ID to be validated. |

## PluginSetupRef

```solidity
struct PluginSetupRef {
  struct PluginRepo.Tag versionTag;
  contract PluginRepo pluginSetupRepo;
}
```

## PreparationType

```solidity
enum PreparationType {
  None,
  Installation,
  Update,
  Uninstallation
}
```

## _getPluginInstallationId

```solidity
function _getPluginInstallationId(address _dao, address _plugin) internal pure returns (bytes32)
```

Returns an ID for plugin installation by hashing the DAO and plugin address.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dao | address | The address of the DAO conducting the setup. |
| _plugin | address | The plugin address. |

## _getPreparedSetupId

```solidity
function _getPreparedSetupId(struct PluginSetupRef _pluginSetupRef, bytes32 _permissionsHash, bytes32 _helpersHash, bytes _data, enum PreparationType _preparationType) internal pure returns (bytes32)
```

Returns an ID for prepared setup obtained from hashing characterizing elements.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _pluginSetupRef | struct PluginSetupRef | The reference of the plugin setup containing plugin setup repo and version tag. |
| _permissionsHash | bytes32 | The hash of the permission operations requested by the setup. |
| _helpersHash | bytes32 | The hash of the helper contract addresses. |
| _data | bytes | The bytes-encoded initialize data for the upgrade that is returned by `prepareUpdate`. |
| _preparationType | enum PreparationType | The type of preparation the plugin is currently undergoing. Without this, it is possible to call `applyUpdate` even after `applyInstallation` is called. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | The prepared setup id. |

## _getAppliedSetupId

```solidity
function _getAppliedSetupId(struct PluginSetupRef _pluginSetupRef, bytes32 _helpersHash) internal pure returns (bytes32)
```

Returns an identifier for applied installations.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _pluginSetupRef | struct PluginSetupRef | The reference of the plugin setup containing plugin setup repo and version tag. |
| _helpersHash | bytes32 | The hash of the helper contract addresses. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | The applied setup id. |

## hashHelpers

```solidity
function hashHelpers(address[] _helpers) internal pure returns (bytes32)
```

Returns a hash of an array of helper addresses (contracts or EOAs).

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _helpers | address[] | The array of helper addresses (contracts or EOAs) to be hashed. |

## hashPermissions

```solidity
function hashPermissions(struct PermissionLib.MultiTargetPermission[] _permissions) internal pure returns (bytes32)
```

Returns a hash of an array of multi-targeted permission operations.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _permissions | struct PermissionLib.MultiTargetPermission[] | The array of of multi-targeted permission operations. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | The hash of the array of permission operations. |

## InterfaceBasedRegistry

An [ERC-165](https://eips.ethereum.org/EIPS/eip-165)-based registry for contracts.

### UPGRADE_REGISTRY_PERMISSION_ID

```solidity
bytes32 UPGRADE_REGISTRY_PERMISSION_ID
```

The ID of the permission required to call the `_authorizeUpgrade` function.

### targetInterfaceId

```solidity
bytes4 targetInterfaceId
```

The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID that the target contracts being registered must support.

### entries

```solidity
mapping(address => bool) entries
```

The mapping containing the registry entries returning true for registered contract addresses.

### ContractAlreadyRegistered

```solidity
error ContractAlreadyRegistered(address registrant)
```

Thrown if the contract is already registered.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| registrant | address | The address of the contract to be registered. |

### ContractInterfaceInvalid

```solidity
error ContractInterfaceInvalid(address registrant)
```

Thrown if the contract does not support the required interface.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| registrant | address | The address of the contract to be registered. |

### ContractERC165SupportInvalid

```solidity
error ContractERC165SupportInvalid(address registrant)
```

Thrown if the contract does not support ERC165.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| registrant | address | The address of the contract. |

### __InterfaceBasedRegistry_init

```solidity
function __InterfaceBasedRegistry_init(contract IDAO _managingDao, bytes4 _targetInterfaceId) internal virtual
```

Initializes the component.

_This is required for the UUPS upgradeability pattern._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _managingDao | contract IDAO | The interface of the DAO managing the components permissions. |
| _targetInterfaceId | bytes4 | The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface id of the contracts to be registered. |

### _authorizeUpgrade

```solidity
function _authorizeUpgrade(address) internal virtual
```

Internal method authorizing the upgrade of the contract via the [upgradeability mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).

_The caller must have the `UPGRADE_REGISTRY_PERMISSION_ID` permission._

### _register

```solidity
function _register(address _registrant) internal
```

Register an [ERC-165](https://eips.ethereum.org/EIPS/eip-165) contract address.

_The managing DAO needs to grant REGISTER_PERMISSION_ID to registrar._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _registrant | address | The address of an [ERC-165](https://eips.ethereum.org/EIPS/eip-165) contract. |

## isSubdomainValid

```solidity
function isSubdomainValid(string subDomain) internal pure returns (bool)
```

Validates that a subdomain name is composed only from characters in the allowed character set:
- the lowercase letters `a-z`
- the digits `0-9`
- the hyphen `-`

_This function allows empty (zero-length) subdomains. If this should not be allowed, make sure to add a respective check when using this function in your code.
Aborts on the first invalid char found._

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| subDomain | string | The name of the DAO. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | `true` if the name is valid or `false` if at least one char is invalid. |

## Dummy

## ENSSubdomainRegistrar

This contract registers ENS subdomains under a parent domain specified in the initialization process and maintains ownership of the subdomain since only the resolver address is set. This contract must either be the domain node owner or an approved operator of the node owner. The default resolver being used is the one specified in the parent domain.

### UPGRADE_REGISTRAR_PERMISSION_ID

```solidity
bytes32 UPGRADE_REGISTRAR_PERMISSION_ID
```

The ID of the permission required to call the `_authorizeUpgrade` function.

### REGISTER_ENS_SUBDOMAIN_PERMISSION_ID

```solidity
bytes32 REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
```

The ID of the permission required to call the `registerSubnode` and `setDefaultResolver` function.

### ens

```solidity
contract ENS ens
```

The ENS registry contract

### node

```solidity
bytes32 node
```

The namehash of the domain on which subdomains are registered.

### resolver

```solidity
address resolver
```

The address of the ENS resolver resolving the names to an address.

### AlreadyRegistered

```solidity
error AlreadyRegistered(bytes32 subnode, address nodeOwner)
```

Thrown if the subnode is already registered.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| subnode | bytes32 | The subnode namehash. |
| nodeOwner | address | The node owner address. |

### InvalidResolver

```solidity
error InvalidResolver(bytes32 node, address resolver)
```

Thrown if node's resolver is invalid.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| node | bytes32 | The node namehash. |
| resolver | address | The node resolver address. |

### constructor

```solidity
constructor() public
```

_Used to disallow initializing the implementation contract by an attacker for extra safety._

### initialize

```solidity
function initialize(contract IDAO _managingDao, contract ENS _ens, bytes32 _node) external
```

Initializes the component by
- checking that the contract is the domain node owner or an approved operator
- initializing the underlying component
- registering the [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID
- setting the ENS contract, the domain node hash, and resolver.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _managingDao | contract IDAO | The interface of the DAO managing the components permissions. |
| _ens | contract ENS | The interface of the ENS registry to be used. |
| _node | bytes32 | The ENS parent domain node under which the subdomains are to be registered. |

### _authorizeUpgrade

```solidity
function _authorizeUpgrade(address) internal virtual
```

Internal method authorizing the upgrade of the contract via the [upgradeability mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).

_The caller must have the `UPGRADE_REGISTRAR_PERMISSION_ID` permission._

### registerSubnode

```solidity
function registerSubnode(bytes32 _label, address _targetAddress) external
```

Registers a new subdomain with this registrar as the owner and set the target address in the resolver.

_It reverts with no message if this contract isn't the owner nor an approved operator for the given node._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _label | bytes32 | The labelhash of the subdomain name. |
| _targetAddress | address | The address to which the subdomain resolves. |

### setDefaultResolver

```solidity
function setDefaultResolver(address _resolver) external
```

Sets the default resolver contract address that the subdomains being registered will use.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _resolver | address | The resolver contract to be used. |

## ProtocolVersionMock

## ActionExecute

A dummy contract to test if DAO can successfully execute an action

### num

```solidity
uint256 num
```

### setTest

```solidity
function setTest(uint256 newNum) public returns (uint256)
```

### fail

```solidity
function fail() public pure
```

## CallbackHandlerMockHelper

### callbackHandlerMockAddr

```solidity
address callbackHandlerMockAddr
```

### handleCallback

```solidity
function handleCallback(bytes4 selector, bytes data) external returns (bytes4)
```

Calls the internal `_handleCallback` on the parent `CallbackHandler` for testing purposes.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| selector | bytes4 | The function selector of the callback function to be tested. |
| data | bytes | Arbitrary data accompanying the callback that will be emitted with the `CallbackReceived` event. |

### registerCallback

```solidity
function registerCallback(bytes4 selector, bytes4 magicNumber) external
```

Executes `_registerCallback` on the parent to register magic number per selector.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| selector | bytes4 | The function selector. |
| magicNumber | bytes4 | The selector's magic number. |

## GasConsumer

This contract is used for testing to consume gas.

### store

```solidity
mapping(uint256 => uint256) store
```

### consumeGas

```solidity
function consumeGas(uint256 count) external
```

## PermissionConditionMock

A mock permission condition that can be set to permit or deny every call.

_DO NOT USE IN PRODUCTION!_

### answer

```solidity
bool answer
```

### constructor

```solidity
constructor() public
```

### setAnswer

```solidity
function setAnswer(bool _answer) external
```

### isGranted

```solidity
function isGranted(address _where, address _who, bytes32 _permissionId, bytes _data) external view returns (bool)
```

Checks if a call is permitted.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _where | address | The address of the target contract. |
| _who | address | The address (EOA or contract) for which the permissions are checked. |
| _permissionId | bytes32 | The permission identifier. |
| _data | bytes | Optional data passed to the `PermissionCondition` implementation. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool |  |

## PermissionManagerTest

### TEST_PERMISSION_1_ID

```solidity
bytes32 TEST_PERMISSION_1_ID
```

### TEST_PERMISSION_2_ID

```solidity
bytes32 TEST_PERMISSION_2_ID
```

### init

```solidity
function init(address _who) public
```

### getAuthPermission

```solidity
function getAuthPermission(address _where, address _who, bytes32 _permissionId) public view returns (address)
```

### getPermissionHash

```solidity
function getPermissionHash(address _where, address _who, bytes32 _permissionId) public pure returns (bytes32)
```

### getAnyAddr

```solidity
function getAnyAddr() public pure returns (address)
```

### hasPermission

```solidity
function hasPermission(address _where, address _who, bytes32 _permissionId, bytes _data) public view returns (bool)
```

### isPermissionRestrictedForAnyAddr

```solidity
function isPermissionRestrictedForAnyAddr(bytes32 _permissionId) internal view virtual returns (bool)
```

Decides if the granting permissionId is restricted when `_who == ANY_ADDR` or `_where == ANY_ADDR`.

_By default, every permission is unrestricted and it is the derived contract's responsibility to override it. Note, that the `ROOT_PERMISSION_ID` is included and not required to be set it again._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _permissionId | bytes32 | The permission identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not the permission is restricted. |

## PluginCloneableV1Mock

### state1

```solidity
uint256 state1
```

### initialize

```solidity
function initialize(contract IDAO _dao) external
```

## PluginCloneableV1MockBad

### state1

```solidity
uint256 state1
```

### initialize

```solidity
function initialize(contract IDAO _dao) external
```

## PluginCloneableV2Mock

### state1

```solidity
uint256 state1
```

### state2

```solidity
uint256 state2
```

### initialize

```solidity
function initialize(contract IDAO _dao) external
```

## PluginCloneableSetupV1Mock

### constructor

```solidity
constructor(address implementation) public
```

### prepareInstallation

```solidity
function prepareInstallation(address _dao, bytes) public virtual returns (address plugin, struct IPluginSetup.PreparedSetupData preparedSetupData)
```

Prepares the installation of a plugin.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dao | address | The address of the installing DAO. |
|  | bytes |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| plugin | address | The address of the `Plugin` contract being prepared for installation. |
| preparedSetupData | struct IPluginSetup.PreparedSetupData | The deployed plugin's relevant data which consists of helpers and permissions. |

### prepareUninstallation

```solidity
function prepareUninstallation(address _dao, struct IPluginSetup.SetupPayload _payload) external virtual returns (struct PermissionLib.MultiTargetPermission[] permissions)
```

Prepares the uninstallation of a plugin.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dao | address | The address of the uninstalling DAO. |
| _payload | struct IPluginSetup.SetupPayload | The relevant data necessary for the `prepareUninstallation`. See above. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| permissions | struct PermissionLib.MultiTargetPermission[] | The array of multi-targeted permission operations to be applied by the `PluginSetupProcessor` to the uninstalling DAO. |

## PluginCloneableSetupV1MockBad

### constructor

```solidity
constructor(address implementation) public
```

### prepareInstallation

```solidity
function prepareInstallation(address _dao, bytes) public virtual returns (address plugin, struct IPluginSetup.PreparedSetupData preparedSetupData)
```

Prepares the installation of a plugin.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dao | address | The address of the installing DAO. |
|  | bytes |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| plugin | address | The address of the `Plugin` contract being prepared for installation. |
| preparedSetupData | struct IPluginSetup.PreparedSetupData | The deployed plugin's relevant data which consists of helpers and permissions. |

### prepareUninstallation

```solidity
function prepareUninstallation(address _dao, struct IPluginSetup.SetupPayload _payload) external virtual returns (struct PermissionLib.MultiTargetPermission[] permissions)
```

Prepares the uninstallation of a plugin.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dao | address | The address of the uninstalling DAO. |
| _payload | struct IPluginSetup.SetupPayload | The relevant data necessary for the `prepareUninstallation`. See above. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| permissions | struct PermissionLib.MultiTargetPermission[] | The array of multi-targeted permission operations to be applied by the `PluginSetupProcessor` to the uninstalling DAO. |

## PluginCloneableSetupV2Mock

### constructor

```solidity
constructor(address implementation) public
```

### prepareInstallation

```solidity
function prepareInstallation(address _dao, bytes) public virtual returns (address plugin, struct IPluginSetup.PreparedSetupData preparedSetupData)
```

### prepareUninstallation

```solidity
function prepareUninstallation(address _dao, struct IPluginSetup.SetupPayload _payload) external virtual returns (struct PermissionLib.MultiTargetPermission[] permissions)
```

## PluginV1Mock

### state1

```solidity
uint256 state1
```

### constructor

```solidity
constructor(contract IDAO _dao) public
```

## NO_CONDITION

```solidity
address NO_CONDITION
```

## ConflictingValues

```solidity
error ConflictingValues()
```

## mockPermissions

```solidity
function mockPermissions(uint160 start, uint160 end, enum PermissionLib.Operation op) internal pure returns (struct PermissionLib.MultiTargetPermission[] permissions)
```

## mockHelpers

```solidity
function mockHelpers(uint160 amount) internal pure returns (address[] helpers)
```

## mockPluginProxy

```solidity
function mockPluginProxy(address _pluginBase, address _dao) internal returns (address)
```

## PluginUUPSUpgradeableV1Mock

### state1

```solidity
uint256 state1
```

### initialize

```solidity
function initialize(contract IDAO _dao) external
```

## PluginUUPSUpgradeableV2Mock

### state1

```solidity
uint256 state1
```

### state2

```solidity
uint256 state2
```

### initialize

```solidity
function initialize(contract IDAO _dao) external
```

### initializeV1toV2

```solidity
function initializeV1toV2() external
```

## PluginUUPSUpgradeableV3Mock

### state1

```solidity
uint256 state1
```

### state2

```solidity
uint256 state2
```

### state3

```solidity
uint256 state3
```

### initialize

```solidity
function initialize(contract IDAO _dao) external
```

### initializeV1toV3

```solidity
function initializeV1toV3() external
```

### initializeV2toV3

```solidity
function initializeV2toV3() external
```

## PluginUUPSUpgradeableSetupV1Mock

### constructor

```solidity
constructor(address implementation) public
```

### prepareInstallation

```solidity
function prepareInstallation(address _dao, bytes) public virtual returns (address plugin, struct IPluginSetup.PreparedSetupData preparedSetupData)
```

Prepares the installation of a plugin.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dao | address | The address of the installing DAO. |
|  | bytes |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| plugin | address | The address of the `Plugin` contract being prepared for installation. |
| preparedSetupData | struct IPluginSetup.PreparedSetupData | The deployed plugin's relevant data which consists of helpers and permissions. |

### prepareUpdate

```solidity
function prepareUpdate(address _dao, uint16 _fromBuild, struct IPluginSetup.SetupPayload _payload) external virtual returns (bytes, struct IPluginSetup.PreparedSetupData)
```

Prepares the update of a plugin.

_The default implementation for the initial build 1 that reverts because no earlier build exists._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dao | address | The address of the updating DAO. |
| _fromBuild | uint16 | The build number of the plugin to update from. |
| _payload | struct IPluginSetup.SetupPayload | The relevant data necessary for the `prepareUpdate`. See above. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes |  |
| [1] | struct IPluginSetup.PreparedSetupData |  |

### prepareUninstallation

```solidity
function prepareUninstallation(address _dao, struct IPluginSetup.SetupPayload _payload) external virtual returns (struct PermissionLib.MultiTargetPermission[] permissions)
```

Prepares the uninstallation of a plugin.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dao | address | The address of the uninstalling DAO. |
| _payload | struct IPluginSetup.SetupPayload | The relevant data necessary for the `prepareUninstallation`. See above. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| permissions | struct PermissionLib.MultiTargetPermission[] | The array of multi-targeted permission operations to be applied by the `PluginSetupProcessor` to the uninstalling DAO. |

## PluginUUPSUpgradeableSetupV1MockBad

### constructor

```solidity
constructor(address implementation) public
```

### prepareInstallation

```solidity
function prepareInstallation(address _dao, bytes) public pure returns (address plugin, struct IPluginSetup.PreparedSetupData preparedSetupData)
```

Prepares the installation of a plugin.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dao | address | The address of the installing DAO. |
|  | bytes |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| plugin | address | The address of the `Plugin` contract being prepared for installation. |
| preparedSetupData | struct IPluginSetup.PreparedSetupData | The deployed plugin's relevant data which consists of helpers and permissions. |

## PluginUUPSUpgradeableSetupV2Mock

### constructor

```solidity
constructor(address implementation) public
```

### prepareInstallation

```solidity
function prepareInstallation(address _dao, bytes) public virtual returns (address plugin, struct IPluginSetup.PreparedSetupData preparedSetupData)
```

### prepareUpdate

```solidity
function prepareUpdate(address _dao, uint16 _currentBuild, struct IPluginSetup.SetupPayload _payload) public virtual returns (bytes initData, struct IPluginSetup.PreparedSetupData preparedSetupData)
```

## PluginUUPSUpgradeableSetupV3Mock

### constructor

```solidity
constructor(address implementation) public
```

### prepareInstallation

```solidity
function prepareInstallation(address _dao, bytes) public virtual returns (address plugin, struct IPluginSetup.PreparedSetupData preparedSetupData)
```

### prepareUpdate

```solidity
function prepareUpdate(address _dao, uint16 _currentBuild, struct IPluginSetup.SetupPayload _payload) public virtual returns (bytes initData, struct IPluginSetup.PreparedSetupData preparedSetupData)
```

## PluginUUPSUpgradeableSetupV4Mock

_With this plugin setup, the plugin base implementation doesn't change.
This setup is a good example when you want to design a new plugin setup
which uses the same base implementation(doesn't update the logic contract)
but applies new/modifier permissions on it._

### constructor

```solidity
constructor(address implementation) public
```

### prepareInstallation

```solidity
function prepareInstallation(address _dao, bytes) public virtual returns (address plugin, struct IPluginSetup.PreparedSetupData preparedSetupData)
```

### prepareUpdate

```solidity
function prepareUpdate(address _dao, uint16 _currentBuild, struct IPluginSetup.SetupPayload _payload) public virtual returns (bytes initData, struct IPluginSetup.PreparedSetupData preparedSetupData)
```

## ERC1155Mock

A mock [ERC-1155](https://eips.ethereum.org/EIPS/eip-1155) token that can be minted and burned by everyone.

_DO NOT USE IN PRODUCTION!_

### constructor

```solidity
constructor(string _uri) public
```

### mint

```solidity
function mint(address account, uint256 tokenId, uint256 amount) public
```

### burn

```solidity
function burn(address account, uint256 tokenId, uint256 amount) public
```

## ERC20Mock

A mock [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token that can be minted and burned by everyone.

_DO NOT USE IN PRODUCTION!_

### decimals_

```solidity
uint8 decimals_
```

### constructor

```solidity
constructor(string _name, string _symbol) public
```

### setDecimals

```solidity
function setDecimals(uint8 _decimals) public
```

### decimals

```solidity
function decimals() public view returns (uint8)
```

_Returns the number of decimals used to get its user representation.
For example, if `decimals` equals `2`, a balance of `505` tokens should
be displayed to a user as `5.05` (`505 / 10 ** 2`).

Tokens usually opt for a value of 18, imitating the relationship between
Ether and Wei. This is the default value returned by this function, unless
it's overridden.

NOTE: This information is only used for _display_ purposes: it in
no way affects any of the arithmetic of the contract, including
{IERC20-balanceOf} and {IERC20-transfer}._

### setBalance

```solidity
function setBalance(address to, uint256 amount) public
```

## ERC721Mock

A mock [ERC-721](https://eips.ethereum.org/EIPS/eip-721) token that can be minted and burned by everyone.

_DO NOT USE IN PRODUCTION!_

### constructor

```solidity
constructor(string name_, string symbol_) public
```

### mint

```solidity
function mint(address account, uint256 tokenId) public
```

### burn

```solidity
function burn(uint256 tokenId) public
```

## InterfaceBasedRegistryMock

### REGISTER_PERMISSION_ID

```solidity
bytes32 REGISTER_PERMISSION_ID
```

### Registered

```solidity
event Registered(address)
```

### initialize

```solidity
function initialize(contract IDAO _dao, bytes4 targetInterface) external
```

### register

```solidity
function register(address registrant) external
```

## RegistryUtils

### isSubdomainValid

```solidity
function isSubdomainValid(string subdomain) external pure returns (bool)
```

