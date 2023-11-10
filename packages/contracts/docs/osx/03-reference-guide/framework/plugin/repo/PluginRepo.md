
## Description

The plugin repository contract required for managing and publishing different plugin versions within the Aragon DAO framework.

## Implementation

### public struct Tag

```solidity
struct Tag {
  uint8 release;
  uint16 build;
}
```
### public struct Version

```solidity
struct Version {
  struct PluginRepo.Tag tag;
  address pluginSetup;
  bytes buildMetadata;
}
```
### public variable MAINTAINER_PERMISSION_ID

The ID of the permission required to call the `createVersion` function.

```solidity
bytes32 MAINTAINER_PERMISSION_ID 
```

### public variable UPGRADE_REPO_PERMISSION_ID

The ID of the permission required to call the `createVersion` function.

```solidity
bytes32 UPGRADE_REPO_PERMISSION_ID 
```

### internal variable buildsPerRelease

The mapping between release and build numbers.

```solidity
mapping(uint8 => uint16) buildsPerRelease 
```

### internal variable versions

The mapping between the version hash and the corresponding version information.

```solidity
mapping(bytes32 => struct PluginRepo.Version) versions 
```

### internal variable latestTagHashForPluginSetup

The mapping between the plugin setup address and its corresponding version hash.

```solidity
mapping(address => bytes32) latestTagHashForPluginSetup 
```

### public variable latestRelease

The ID of the latest release.

```solidity
uint8 latestRelease 
```

*The maximum release number is 255.*
###  error VersionHashDoesNotExist

Thrown if a version does not exist.

```solidity
error VersionHashDoesNotExist(bytes32 versionHash) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `versionHash` | `bytes32` | The tag hash. |

###  error InvalidPluginSetupInterface

Thrown if a plugin setup contract does not inherit from `PluginSetup`.

```solidity
error InvalidPluginSetupInterface() 
```

###  error ReleaseZeroNotAllowed

Thrown if a release number is zero.

```solidity
error ReleaseZeroNotAllowed() 
```

###  error InvalidReleaseIncrement

Thrown if a release number is incremented by more than one.

```solidity
error InvalidReleaseIncrement(uint8 latestRelease, uint8 newRelease) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `latestRelease` | `uint8` | The latest release number. |
| `newRelease` | `uint8` | The new release number. |

###  error PluginSetupAlreadyInPreviousRelease

Thrown if the same plugin setup contract exists already in a previous releases.

```solidity
error PluginSetupAlreadyInPreviousRelease(uint8 release, uint16 build, address pluginSetup) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `release` | `uint8` | The release number of the already existing plugin setup. |
| `build` | `uint16` | The build number of the already existing plugin setup. |
| `pluginSetup` | `address` | The plugin setup contract address. |

###  error EmptyReleaseMetadata

Thrown if the metadata URI is empty.

```solidity
error EmptyReleaseMetadata() 
```

###  error ReleaseDoesNotExist

Thrown if release does not exist.

```solidity
error ReleaseDoesNotExist() 
```

###  event VersionCreated

Thrown if the same plugin setup exists in previous releases.

```solidity
event VersionCreated(uint8 release, uint16 build, address pluginSetup, bytes buildMetadata) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `release` | `uint8` | The release number. |
| `build` | `uint16` | The build number. |
| `pluginSetup` | `address` | The address of the plugin setup contract. |
| `buildMetadata` | `bytes` | The build metadata URI. |

###  event ReleaseMetadataUpdated

Thrown when a release's metadata was updated.

```solidity
event ReleaseMetadataUpdated(uint8 release, bytes releaseMetadata) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `release` | `uint8` | The release number. |
| `releaseMetadata` | `bytes` | The release metadata URI. |

### public function constructor

```solidity
constructor() public 
```

*Used to disallow initializing the implementation contract by an attacker for extra safety.*
### external function initialize

Initializes the contract by
- initializing the permission manager
- granting the `MAINTAINER_PERMISSION_ID` permission to the initial owner.

```solidity
function initialize(address initialOwner) external 
```

*This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).*
### external function createVersion

Creates a new plugin version as the latest build for an existing release number or the first build for a new release number for the provided `PluginSetup` contract address and metadata.

```solidity
function createVersion(uint8 _release, address _pluginSetup, bytes _buildMetadata, bytes _releaseMetadata) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_release` | `uint8` | The release number. |
| `_pluginSetup` | `address` |  |
| `_buildMetadata` | `bytes` | The build metadata URI. |
| `_releaseMetadata` | `bytes` | The release metadata URI. |

### external function updateReleaseMetadata

Updates the metadata for release with content `@fromHex(_releaseMetadata)`.

```solidity
function updateReleaseMetadata(uint8 _release, bytes _releaseMetadata) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_release` | `uint8` | The release number. |
| `_releaseMetadata` | `bytes` | The release metadata URI. |

### public function getLatestVersion

Returns the latest version for a given release number.

```solidity
function getLatestVersion(uint8 _release) public view returns (struct PluginRepo.Version) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_release` | `uint8` | The release number. |
| **Output** | |
|  `0`  | `struct PluginRepo.Version` | The latest version of this release. |

### public function getLatestVersion

Returns the latest version for a given plugin setup.

```solidity
function getLatestVersion(address _pluginSetup) public view returns (struct PluginRepo.Version) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_pluginSetup` | `address` | The plugin setup address |
| **Output** | |
|  `0`  | `struct PluginRepo.Version` | The latest version associated with the plugin Setup. |

### public function getVersion

Returns the version associated with a tag.

```solidity
function getVersion(struct PluginRepo.Tag _tag) public view returns (struct PluginRepo.Version) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_tag` | `struct PluginRepo.Tag` | The version tag. |
| **Output** | |
|  `0`  | `struct PluginRepo.Version` | The version associated with the tag. |

### public function getVersion

Returns the version for a tag hash.

```solidity
function getVersion(bytes32 _tagHash) public view returns (struct PluginRepo.Version) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_tagHash` | `bytes32` | The tag hash. |
| **Output** | |
|  `0`  | `struct PluginRepo.Version` | The version associated with a tag hash. |

### public function buildCount

Gets the total number of builds for a given release number.

```solidity
function buildCount(uint8 _release) public view returns (uint256) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_release` | `uint8` | The release number. |
| **Output** | |
|  `0`  | `uint256` | The number of builds of this release. |

### internal function tagHash

The hash of the version tag obtained from the packed, bytes-encoded release and build number.

```solidity
function tagHash(struct PluginRepo.Tag _tag) internal pure returns (bytes32) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_tag` | `struct PluginRepo.Tag` | The version tag. |
| **Output** | |
|  `0`  | `bytes32` | The version tag hash. |

### internal function _authorizeUpgrade

Internal method authorizing the upgrade of the contract via the [upgradeability mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).

```solidity
function _authorizeUpgrade(address) internal virtual 
```

*The caller must have the `UPGRADE_REPO_PERMISSION_ID` permission.*
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

<!--CONTRACT_END-->

