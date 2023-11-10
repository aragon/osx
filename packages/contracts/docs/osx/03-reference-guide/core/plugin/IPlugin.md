
## Description

An interface defining the traits of a plugin.

## Implementation

###  enum PluginType

```solidity
enum PluginType {
  UUPS,
  Cloneable,
  Constructable
}
```
### external function pluginType

Returns the plugin's type

```solidity
function pluginType() external view returns (enum IPlugin.PluginType) 
```

<!--CONTRACT_END-->

