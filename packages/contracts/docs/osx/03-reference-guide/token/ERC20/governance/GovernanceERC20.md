
## Description

An [OpenZeppelin `Votes`](https://docs.openzeppelin.com/contracts/4.x/api/governance#Votes) compatible [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token that can be used for voting and is managed by a DAO.

## Implementation

### public variable MINT_PERMISSION_ID

The permission identifier to mint new tokens

```solidity
bytes32 MINT_PERMISSION_ID 
```

### public struct MintSettings

```solidity
struct MintSettings {
  address[] receivers;
  uint256[] amounts;
}
```
###  error MintSettingsArrayLengthMismatch

Thrown if the number of receivers and amounts specified in the mint settings do not match.

```solidity
error MintSettingsArrayLengthMismatch(uint256 receiversArrayLength, uint256 amountsArrayLength) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `receiversArrayLength` | `uint256` | The length of the `receivers` array. |
| `amountsArrayLength` | `uint256` | The length of the `amounts` array. |

### public function constructor

Calls the initialize function.

```solidity
constructor(contract IDAO _dao, string _name, string _symbol, struct GovernanceERC20.MintSettings _mintSettings) public 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `contract IDAO` | The managing DAO. |
| `_name` | `string` | The name of the [ERC-20](https://eips.ethereum.org/EIPS/eip-20) governance token. |
| `_symbol` | `string` | The symbol of the [ERC-20](https://eips.ethereum.org/EIPS/eip-20) governance token. |
| `_mintSettings` | `struct GovernanceERC20.MintSettings` | The token mint settings struct containing the `receivers` and `amounts`. |

### public function initialize

Initializes the contract and mints tokens to a list of receivers.

```solidity
function initialize(contract IDAO _dao, string _name, string _symbol, struct GovernanceERC20.MintSettings _mintSettings) public 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `contract IDAO` | The managing DAO. |
| `_name` | `string` | The name of the [ERC-20](https://eips.ethereum.org/EIPS/eip-20) governance token. |
| `_symbol` | `string` | The symbol of the [ERC-20](https://eips.ethereum.org/EIPS/eip-20) governance token. |
| `_mintSettings` | `struct GovernanceERC20.MintSettings` | The token mint settings struct containing the `receivers` and `amounts`. |

### public function supportsInterface

Checks if this or the parent contract supports an interface by its ID.

```solidity
function supportsInterface(bytes4 _interfaceId) public view virtual returns (bool) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_interfaceId` | `bytes4` | The ID of the interface. |
| **Output** | |
|  `0`  | `bool` | Returns `true` if the interface is supported. |

### external function mint

Mints tokens to an address.

```solidity
function mint(address to, uint256 amount) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `to` | `address` | The address receiving the tokens. |
| `amount` | `uint256` | The amount of tokens to be minted. |

### internal function _afterTokenTransfer

```solidity
function _afterTokenTransfer(address from, address to, uint256 amount) internal 
```

*Move voting power when tokens are transferred.

Emits a {IVotes-DelegateVotesChanged} event.*
<!--CONTRACT_END-->

