
## Description

An interface defining the semantic OSx protocol version.

## Implementation

### external function protocolVersion

Returns the protocol version at which the current contract was built. Use it to check for future upgrades that might be applicable.

```solidity
function protocolVersion() external view returns (uint8[3] _version) 
```

| Output | Type | Description |
| ------ | ---- | ----------- |
|  `_version`  | `uint8[3]` | Returns the semantic OSx protocol version. |

<!--CONTRACT_END-->

