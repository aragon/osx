
## Description

This contract is the entry point to the Aragon DAO framework and provides our users a simple and easy to use public interface.

Public API of the Aragon DAO framework.

## Implementation

### public variable EXECUTE_PERMISSION_ID

The ID of the permission required to call the `execute` function.

```solidity
bytes32 EXECUTE_PERMISSION_ID 
```

### public variable UPGRADE_DAO_PERMISSION_ID

The ID of the permission required to call the `_authorizeUpgrade` function.

```solidity
bytes32 UPGRADE_DAO_PERMISSION_ID 
```

### public variable SET_METADATA_PERMISSION_ID

The ID of the permission required to call the `setMetadata` function.

```solidity
bytes32 SET_METADATA_PERMISSION_ID 
```

### public variable SET_TRUSTED_FORWARDER_PERMISSION_ID

The ID of the permission required to call the `setTrustedForwarder` function.

```solidity
bytes32 SET_TRUSTED_FORWARDER_PERMISSION_ID 
```

### public variable SET_SIGNATURE_VALIDATOR_PERMISSION_ID

The ID of the permission required to call the `setSignatureValidator` function.

```solidity
bytes32 SET_SIGNATURE_VALIDATOR_PERMISSION_ID 
```

### public variable REGISTER_STANDARD_CALLBACK_PERMISSION_ID

The ID of the permission required to call the `registerStandardCallback` function.

```solidity
bytes32 REGISTER_STANDARD_CALLBACK_PERMISSION_ID 
```

### internal variable MAX_ACTIONS

The internal constant storing the maximal action array length.

```solidity
uint256 MAX_ACTIONS 
```

### public variable signatureValidator

The [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) signature validator contract.

```solidity
contract IERC1271 signatureValidator 
```

*Added in v1.0.0.*
###  error ReentrantCall

Thrown if a call is reentrant.

```solidity
error ReentrantCall() 
```

###  error TooManyActions

Thrown if the action array length is larger than `MAX_ACTIONS`.

```solidity
error TooManyActions() 
```

###  error ActionFailed

Thrown if action execution has failed.

```solidity
error ActionFailed(uint256 index) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `index` | `uint256` | The index of the action in the action array that failed. |

###  error InsufficientGas

Thrown if an action has insufficent gas left.

```solidity
error InsufficientGas() 
```

###  error ZeroAmount

Thrown if the deposit amount is zero.

```solidity
error ZeroAmount() 
```

###  error NativeTokenDepositAmountMismatch

Thrown if there is a mismatch between the expected and actually deposited amount of native tokens.

```solidity
error NativeTokenDepositAmountMismatch(uint256 expected, uint256 actual) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `expected` | `uint256` | The expected native token amount. |
| `actual` | `uint256` | The actual native token amount deposited. |

###  error ProtocolVersionUpgradeNotSupported

Thrown if an upgrade is not supported from a specific protocol version .

```solidity
error ProtocolVersionUpgradeNotSupported(uint8[3] protocolVersion) 
```

###  event NewURI

Emitted when a new DAO URI is set.

```solidity
event NewURI(string daoURI) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `daoURI` | `string` | The new URI. |

### internal modifier nonReentrant

A modifier to protect a function from calling itself, directly or indirectly (reentrancy).

```solidity
modifier nonReentrant() 
```

*Currently, this modifier is only applied to the `execute()` function. If this is used multiple times, private `_beforeNonReentrant()` and `_afterNonReentrant()` functions should be created to prevent code duplication.*
### public function constructor

Disables the initializers on the implementation contract to prevent it from being left uninitialized.

```solidity
constructor() public 
```

### external function initialize

Initializes the DAO by
- setting the reentrancy status variable to `_NOT_ENTERED`
- registering the [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID
- setting the trusted forwarder for meta transactions
- giving the `ROOT_PERMISSION_ID` permission to the initial owner (that should be revoked and transferred to the DAO after setup).

```solidity
function initialize(bytes _metadata, address _initialOwner, address _trustedForwarder, string daoURI_) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_metadata` | `bytes` | IPFS hash that points to all the metadata (logo, description, tags, etc.) of a DAO. |
| `_initialOwner` | `address` | The initial owner of the DAO having the `ROOT_PERMISSION_ID` permission. |
| `_trustedForwarder` | `address` | The trusted forwarder responsible for verifying meta transactions. |
| `daoURI_` | `string` | The DAO URI required to support [ERC-4824](https://eips.ethereum.org/EIPS/eip-4824). |

*This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).*
### external function initializeFrom

Initializes the DAO after an upgrade from a previous protocol version.

```solidity
function initializeFrom(uint8[3] _previousProtocolVersion, bytes _initData) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_previousProtocolVersion` | `uint8[3]` | The semantic protocol version number of the previous DAO implementation contract this upgrade is transitioning from. |
| `_initData` | `bytes` | The initialization data to be passed to via `upgradeToAndCall` (see [ERC-1967](https://docs.openzeppelin.com/contracts/4.x/api/proxy#ERC1967Upgrade)). |

### internal function isPermissionRestrictedForAnyAddr

Decides if the granting permissionId is restricted when `_who == ANY_ADDR` or `_where == ANY_ADDR`.

```solidity
function isPermissionRestrictedForAnyAddr(bytes32 _permissionId) internal pure returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_permissionId` | `bytes32` | The permission identifier. |
| **Output** | |
|  `0`  | `bool` | Whether or not the permission is restricted. |

*By default, every permission is unrestricted and it is the derived contract's responsibility to override it. Note, that the `ROOT_PERMISSION_ID` is included and not required to be set it again.*
### internal function _authorizeUpgrade

Internal method authorizing the upgrade of the contract via the [upgradeability mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).

```solidity
function _authorizeUpgrade(address) internal virtual 
```

*The caller must have the `UPGRADE_DAO_PERMISSION_ID` permission.*
### external function setTrustedForwarder

Setter for the trusted forwarder verifying the meta transaction.

```solidity
function setTrustedForwarder(address _newTrustedForwarder) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_newTrustedForwarder` | `address` |  |

### external function getTrustedForwarder

Getter for the trusted forwarder verifying the meta transaction.

```solidity
function getTrustedForwarder() external view virtual returns (address) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `address` | The trusted forwarder address. |

### external function hasPermission

Checks if an address has permission on a contract via a permission identifier and considers if `ANY_ADDRESS` was used in the granting process.

```solidity
function hasPermission(address _where, address _who, bytes32 _permissionId, bytes _data) external view returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_where` | `address` | The address of the contract. |
| `_who` | `address` | The address of a EOA or contract to give the permissions. |
| `_permissionId` | `bytes32` | The permission identifier. |
| `_data` | `bytes` | The optional data passed to the `PermissionCondition` registered. |
| **Output** | |
|  `0`  | `bool` | Returns true if the address has permission, false if not. |

### external function setMetadata

Updates the DAO metadata (e.g., an IPFS hash).

```solidity
function setMetadata(bytes _metadata) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_metadata` | `bytes` | The IPFS hash of the new metadata object. |

### external function execute

Executes a list of actions. If a zero allow-failure map is provided, a failing action reverts the entire execution. If a non-zero allow-failure map is provided, allowed actions can fail without the entire call being reverted.

```solidity
function execute(bytes32 _callId, struct IDAO.Action[] _actions, uint256 _allowFailureMap) external returns (bytes[] execResults, uint256 failureMap) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_callId` | `bytes32` | The ID of the call. The definition of the value of `callId` is up to the calling contract and can be used, e.g., as a nonce. |
| `_actions` | `struct IDAO.Action[]` | The array of actions. |
| `_allowFailureMap` | `uint256` | A bitmap allowing execution to succeed, even if individual actions might revert. If the bit at index `i` is 1, the execution succeeds even if the `i`th action reverts. A failure map value of 0 requires every action to not revert. |
| **Output** | |
|  `execResults`  | `bytes[]` | The array of results obtained from the executed actions in `bytes`. |
|  `failureMap`  | `uint256` | The resulting failure map containing the actions have actually failed. |

### external function deposit

Deposits (native) tokens to the DAO contract with a reference string.

```solidity
function deposit(address _token, uint256 _amount, string _reference) external payable 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_token` | `address` | The address of the token or address(0) in case of the native token. |
| `_amount` | `uint256` | The amount of tokens to deposit. |
| `_reference` | `string` | The reference describing the deposit reason. |

### external function setSignatureValidator

Setter for the [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) signature validator contract.

```solidity
function setSignatureValidator(address _signatureValidator) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_signatureValidator` | `address` | The address of the signature validator. |

### external function isValidSignature

Checks whether a signature is valid for the provided hash by forwarding the call to the set [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) signature validator contract.

```solidity
function isValidSignature(bytes32 _hash, bytes _signature) external view returns (bytes4) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_hash` | `bytes32` | The hash of the data to be signed. |
| `_signature` | `bytes` | The signature byte array associated with `_hash`. |
| **Output** | |
|  `0`  | `bytes4` | Returns the `bytes4` magic value `0x1626ba7e` if the signature is valid. |

### external function receive

Emits the `NativeTokenDeposited` event to track native token deposits that weren't made via the deposit method.

```solidity
receive() external payable 
```

*This call is bound by the gas limitations for `send`/`transfer` calls introduced by [ERC-2929](https://eips.ethereum.org/EIPS/eip-2929).
Gas cost increases in future hard forks might break this function. As an alternative, [ERC-2930](https://eips.ethereum.org/EIPS/eip-2930)-type transactions using access lists can be employed.*
### external function fallback

Fallback to handle future versions of the [ERC-165](https://eips.ethereum.org/EIPS/eip-165) standard.

```solidity
fallback(bytes _input) external returns (bytes) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_input` | `bytes` | An alias being equivalent to `msg.data`. This feature of the fallback function was introduced with the [solidity compiler version 0.7.6](https://github.com/ethereum/solidity/releases/tag/v0.7.6) |
| **Output** | |
|  `0`  | `bytes` | The magic number registered for the function selector triggering the fallback. |

### internal function _setMetadata

Emits the MetadataSet event if new metadata is set.

```solidity
function _setMetadata(bytes _metadata) internal 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_metadata` | `bytes` | Hash of the IPFS metadata object. |

### internal function _setTrustedForwarder

Sets the trusted forwarder on the DAO and emits the associated event.

```solidity
function _setTrustedForwarder(address _trustedForwarder) internal 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_trustedForwarder` | `address` | The trusted forwarder address. |

### external function registerStandardCallback

Registers an ERC standard having a callback by registering its [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID and callback function signature.

```solidity
function registerStandardCallback(bytes4 _interfaceId, bytes4 _callbackSelector, bytes4 _magicNumber) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_interfaceId` | `bytes4` | The ID of the interface. |
| `_callbackSelector` | `bytes4` | The selector of the callback function. |
| `_magicNumber` | `bytes4` | The magic number to be registered for the function signature. |

### external function daoURI

A distinct Uniform Resource Identifier (URI) pointing to a JSON object following the "EIP-4824 DAO JSON-LD Schema". This JSON file splits into four URIs: membersURI, proposalsURI, activityLogURI, and governanceURI. The membersURI should point to a JSON file that conforms to the "EIP-4824 Members JSON-LD Schema". The proposalsURI should point to a JSON file that conforms to the "EIP-4824 Proposals JSON-LD Schema". The activityLogURI should point to a JSON file that conforms to the "EIP-4824 Activity Log JSON-LD Schema". The governanceURI should point to a flatfile, normatively a .md file. Each of the JSON files named above can be statically hosted or dynamically-generated.

```solidity
function daoURI() external view returns (string) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `string` |  |

### external function setDaoURI

Updates the set DAO URI to a new value.

```solidity
function setDaoURI(string newDaoURI) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `newDaoURI` | `string` | The new DAO URI to be set. |

### internal function _setDaoURI

Sets the new [ERC-4824](https://eips.ethereum.org/EIPS/eip-4824) DAO URI and emits the associated event.

```solidity
function _setDaoURI(string daoURI_) internal 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `daoURI_` | `string` | The new DAO URI. |

<!--CONTRACT_END-->

