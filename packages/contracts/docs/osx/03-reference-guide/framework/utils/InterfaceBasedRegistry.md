
## Description

An [ERC-165](https://eips.ethereum.org/EIPS/eip-165)-based registry for contracts

## Implementation

### public variable UPGRADE_REGISTRY_PERMISSION_ID

The ID of the permission required to call the `_authorizeUpgrade` function.

```solidity
bytes32 UPGRADE_REGISTRY_PERMISSION_ID 
```

### public variable targetInterfaceId

The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID that the target contracts being registered must support.

```solidity
bytes4 targetInterfaceId 
```

### public variable entries

The mapping containing the registry entries returning true for registered contract addresses.

```solidity
mapping(address => bool) entries 
```

###  error ContractAlreadyRegistered

Thrown if the contract is already registered.

```solidity
error ContractAlreadyRegistered(address registrant) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `registrant` | `address` | The address of the contract to be registered. |

###  error ContractInterfaceInvalid

Thrown if the contract does not support the required interface.

```solidity
error ContractInterfaceInvalid(address registrant) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `registrant` | `address` | The address of the contract to be registered. |

###  error ContractERC165SupportInvalid

Thrown if the contract does not support ERC165.

```solidity
error ContractERC165SupportInvalid(address registrant) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `registrant` | `address` | The address of the contract. |

### internal function __InterfaceBasedRegistry_init

Initializes the component.

```solidity
function __InterfaceBasedRegistry_init(contract IDAO _managingDao, bytes4 _targetInterfaceId) internal virtual 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_managingDao` | `contract IDAO` | The interface of the DAO managing the components permissions. |
| `_targetInterfaceId` | `bytes4` | The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface id of the contracts to be registered. |

*This is required for the UUPS upgradability pattern.*
### internal function _authorizeUpgrade

Internal method authorizing the upgrade of the contract via the [upgradeability mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).

```solidity
function _authorizeUpgrade(address) internal virtual 
```

*The caller must have the `UPGRADE_REGISTRY_PERMISSION_ID` permission.*
### internal function _register

Register an [ERC-165](https://eips.ethereum.org/EIPS/eip-165) contract address.

```solidity
function _register(address _registrant) internal 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_registrant` | `address` | The address of an [ERC-165](https://eips.ethereum.org/EIPS/eip-165) contract. |

*The managing DAO needs to grant REGISTER_PERMISSION_ID to registrar.*
<!--CONTRACT_END-->

