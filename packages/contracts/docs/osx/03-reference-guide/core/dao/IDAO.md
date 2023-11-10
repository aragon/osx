
## Description

The interface required for DAOs within the Aragon App DAO framework.

## Implementation

### public struct Action

```solidity
struct Action {
  address to;
  uint256 value;
  bytes data;
}
```
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

###  event MetadataSet

Emitted when the DAO metadata is updated.

```solidity
event MetadataSet(bytes metadata) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `metadata` | `bytes` | The IPFS hash of the new metadata object. |

### external function execute

Executes a list of actions. If a zero allow-failure map is provided, a failing action reverts the entire execution. If a non-zero allow-failure map is provided, allowed actions can fail without the entire call being reverted.

```solidity
function execute(bytes32 _callId, struct IDAO.Action[] _actions, uint256 _allowFailureMap) external returns (bytes[], uint256) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_callId` | `bytes32` | The ID of the call. The definition of the value of `callId` is up to the calling contract and can be used, e.g., as a nonce. |
| `_actions` | `struct IDAO.Action[]` | The array of actions. |
| `_allowFailureMap` | `uint256` | A bitmap allowing execution to succeed, even if individual actions might revert. If the bit at index `i` is 1, the execution succeeds even if the `i`th action reverts. A failure map value of 0 requires every action to not revert. |
| **Output** | |
|  `0`  | `bytes[]` | The array of results obtained from the executed actions in `bytes`. |
|  `1`  | `uint256` | The resulting failure map containing the actions have actually failed. |

###  event Executed

Emitted when a proposal is executed.

```solidity
event Executed(address actor, bytes32 callId, struct IDAO.Action[] actions, uint256 allowFailureMap, uint256 failureMap, bytes[] execResults) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `actor` | `address` | The address of the caller. |
| `callId` | `bytes32` | The ID of the call. |
| `actions` | `struct IDAO.Action[]` | The array of actions executed. |
| `allowFailureMap` | `uint256` | The allow failure map encoding which actions are allowed to fail. |
| `failureMap` | `uint256` | The failure map encoding which actions have failed. |
| `execResults` | `bytes[]` | The array with the results of the executed actions. |

*The value of `callId` is defined by the component/contract calling the execute function. A `Plugin` implementation can use it, for example, as a nonce.*
###  event StandardCallbackRegistered

Emitted when a standard callback is registered.

```solidity
event StandardCallbackRegistered(bytes4 interfaceId, bytes4 callbackSelector, bytes4 magicNumber) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `interfaceId` | `bytes4` | The ID of the interface. |
| `callbackSelector` | `bytes4` | The selector of the callback function. |
| `magicNumber` | `bytes4` | The magic number to be registered for the callback function selector. |

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

###  event Deposited

Emitted when a token deposit has been made to the DAO.

```solidity
event Deposited(address sender, address token, uint256 amount, string _reference) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `sender` | `address` | The address of the sender. |
| `token` | `address` | The address of the deposited token. |
| `amount` | `uint256` | The amount of tokens deposited. |
| `_reference` | `string` | The reference describing the deposit reason. |

###  event NativeTokenDeposited

Emitted when a native token deposit has been made to the DAO.

```solidity
event NativeTokenDeposited(address sender, uint256 amount) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `sender` | `address` | The address of the sender. |
| `amount` | `uint256` | The amount of native tokens deposited. |

*This event is intended to be emitted in the `receive` function and is therefore bound by the gas limitations for `send`/`transfer` calls introduced by [ERC-2929](https://eips.ethereum.org/EIPS/eip-2929).*
### external function setTrustedForwarder

Setter for the trusted forwarder verifying the meta transaction.

```solidity
function setTrustedForwarder(address _trustedForwarder) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_trustedForwarder` | `address` | The trusted forwarder address. |

### external function getTrustedForwarder

Getter for the trusted forwarder verifying the meta transaction.

```solidity
function getTrustedForwarder() external view returns (address) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `address` | The trusted forwarder address. |

###  event TrustedForwarderSet

Emitted when a new TrustedForwarder is set on the DAO.

```solidity
event TrustedForwarderSet(address forwarder) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `forwarder` | `address` | the new forwarder address. |

### external function setSignatureValidator

Setter for the [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) signature validator contract.

```solidity
function setSignatureValidator(address _signatureValidator) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_signatureValidator` | `address` | The address of the signature validator. |

###  event SignatureValidatorSet

Emitted when the signature validator address is updated.

```solidity
event SignatureValidatorSet(address signatureValidator) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `signatureValidator` | `address` | The address of the signature validator. |

### external function isValidSignature

Checks whether a signature is valid for the provided hash by forwarding the call to the set [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) signature validator contract.

```solidity
function isValidSignature(bytes32 _hash, bytes _signature) external returns (bytes4) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_hash` | `bytes32` | The hash of the data to be signed. |
| `_signature` | `bytes` | The signature byte array associated with `_hash`. |
| **Output** | |
|  `0`  | `bytes4` | Returns the `bytes4` magic value `0x1626ba7e` if the signature is valid. |

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

<!--CONTRACT_END-->

