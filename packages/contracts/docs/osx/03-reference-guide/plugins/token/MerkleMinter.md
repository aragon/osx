
## Description

A component minting [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens and distributing them on merkle trees using `MerkleDistributor` clones.

## Implementation

### public variable MERKLE_MINT_PERMISSION_ID

The ID of the permission required to call the `merkleMint` function.

```solidity
bytes32 MERKLE_MINT_PERMISSION_ID 
```

### public variable CHANGE_DISTRIBUTOR_PERMISSION_ID

The ID of the permission required to call the `changeDistributor` function.

```solidity
bytes32 CHANGE_DISTRIBUTOR_PERMISSION_ID 
```

### public variable token

The [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token being distributed.

```solidity
contract IERC20MintableUpgradeable token 
```

### public variable distributorBase

The address of the `MerkleDistributor` to clone from.

```solidity
contract IMerkleDistributor distributorBase 
```

### external function initialize

Initializes the MerkleMinter.

```solidity
function initialize(contract IDAO _dao, contract IERC20MintableUpgradeable _token, contract IMerkleDistributor _distributorBase) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `contract IDAO` | The IDAO interface of the associated DAO. |
| `_token` | `contract IERC20MintableUpgradeable` | A mintable [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token. |
| `_distributorBase` | `contract IMerkleDistributor` | A `MerkleDistributor` to be cloned. |

*This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).*
### external function changeDistributorBase

changes the base distributor address.

```solidity
function changeDistributorBase(contract IMerkleDistributor _distributorBase) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_distributorBase` | `contract IMerkleDistributor` | The address of the base distributor |

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

### external function merkleMint

Mints [ERC-20](https://eips.ethereum.org/EIPS/eip-20) tokens and distributes them using a `MerkleDistributor`.

```solidity
function merkleMint(bytes32 _merkleRoot, uint256 _totalAmount, bytes _tree, bytes _context) external returns (contract IMerkleDistributor distributor) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_merkleRoot` | `bytes32` | The root of the merkle balance tree. |
| `_totalAmount` | `uint256` | The total amount of tokens to be minted. |
| `_tree` | `bytes` | The link to the stored merkle tree. |
| `_context` | `bytes` | Additional info related to the minting process. |
| **Output** | |
|  `distributor`  | `contract IMerkleDistributor` | The `MerkleDistributor` via which the tokens can be claimed. |

<!--CONTRACT_END-->

