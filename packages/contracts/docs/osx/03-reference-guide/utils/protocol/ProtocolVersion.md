
## Description

An abstract, stateless, non-upgradeable contract serves as a base for other contracts requiring awareness of the OSx protocol version.

Do not add any new variables to this contract that would shift down storage in the inheritance chain.

## Implementation

### public function protocolVersion

Returns the protocol version at which the current contract was built. Use it to check for future upgrades that might be applicable.

```solidity
function protocolVersion() public pure returns (uint8[3]) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `0`  | `uint8[3]` |  |

<!--CONTRACT_END-->

