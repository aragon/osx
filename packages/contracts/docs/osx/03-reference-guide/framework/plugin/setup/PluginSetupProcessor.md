
## Description

This contract processes the preparation and application of plugin setups (installation, update, uninstallation) on behalf of a requesting DAO.

This contract is temporarily granted the `ROOT_PERMISSION_ID` permission on the applying DAO and therefore is highly security critical.

## Implementation

### public variable APPLY_INSTALLATION_PERMISSION_ID

The ID of the permission required to call the `applyInstallation` function.

```solidity
bytes32 APPLY_INSTALLATION_PERMISSION_ID 
```

### public variable APPLY_UPDATE_PERMISSION_ID

The ID of the permission required to call the `applyUpdate` function.

```solidity
bytes32 APPLY_UPDATE_PERMISSION_ID 
```

### public variable APPLY_UNINSTALLATION_PERMISSION_ID

The ID of the permission required to call the `applyUninstallation` function.

```solidity
bytes32 APPLY_UNINSTALLATION_PERMISSION_ID 
```

### public struct PluginState

```solidity
struct PluginState {
  uint256 blockNumber;
  bytes32 currentAppliedSetupId;
  mapping(bytes32 => uint256) preparedSetupIdToBlockNumber;
}
```
### public variable states

A mapping between the plugin installation ID (obtained from the DAO and plugin address) and the plugin state information.

```solidity
mapping(bytes32 => struct PluginSetupProcessor.PluginState) states 
```

*This variable is public on purpose to allow future versions to access and migrate the storage.*
### public struct PrepareInstallationParams

```solidity
struct PrepareInstallationParams {
  struct PluginSetupRef pluginSetupRef;
  bytes data;
}
```
### public struct ApplyInstallationParams

```solidity
struct ApplyInstallationParams {
  struct PluginSetupRef pluginSetupRef;
  address plugin;
  struct PermissionLib.MultiTargetPermission[] permissions;
  bytes32 helpersHash;
}
```
### public struct PrepareUpdateParams

```solidity
struct PrepareUpdateParams {
  struct PluginRepo.Tag currentVersionTag;
  struct PluginRepo.Tag newVersionTag;
  contract PluginRepo pluginSetupRepo;
  struct IPluginSetup.SetupPayload setupPayload;
}
```
### public struct ApplyUpdateParams

```solidity
struct ApplyUpdateParams {
  address plugin;
  struct PluginSetupRef pluginSetupRef;
  bytes initData;
  struct PermissionLib.MultiTargetPermission[] permissions;
  bytes32 helpersHash;
}
```
### public struct PrepareUninstallationParams

```solidity
struct PrepareUninstallationParams {
  struct PluginSetupRef pluginSetupRef;
  struct IPluginSetup.SetupPayload setupPayload;
}
```
### public struct ApplyUninstallationParams

```solidity
struct ApplyUninstallationParams {
  address plugin;
  struct PluginSetupRef pluginSetupRef;
  struct PermissionLib.MultiTargetPermission[] permissions;
}
```
### public variable repoRegistry

The plugin repo registry listing the `PluginRepo` contracts versioning the `PluginSetup` contracts.

```solidity
contract PluginRepoRegistry repoRegistry 
```

###  error SetupApplicationUnauthorized

Thrown if a setup is unauthorized and cannot be applied because of a missing permission of the associated DAO.

```solidity
error SetupApplicationUnauthorized(address dao, address caller, bytes32 permissionId) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `dao` | `address` | The address of the DAO to which the plugin belongs. |
| `caller` | `address` | The address (EOA or contract) that requested the application of a setup on the associated DAO. |
| `permissionId` | `bytes32` | The permission identifier. |

*This is thrown if the `APPLY_INSTALLATION_PERMISSION_ID`, `APPLY_UPDATE_PERMISSION_ID`, or APPLY_UNINSTALLATION_PERMISSION_ID is missing.*
###  error PluginNonupgradeable

Thrown if a plugin is not upgradeable.

```solidity
error PluginNonupgradeable(address plugin) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `plugin` | `address` | The address of the plugin contract. |

###  error PluginProxyUpgradeFailed

Thrown if the upgrade of an `UUPSUpgradeable` proxy contract (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)) failed.

```solidity
error PluginProxyUpgradeFailed(address proxy, address implementation, bytes initData) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `proxy` | `address` | The address of the proxy. |
| `implementation` | `address` | The address of the implementation contract. |
| `initData` | `bytes` | The initialization data to be passed to the upgradeable plugin contract via `upgradeToAndCall`. |

###  error IPluginNotSupported

Thrown if a contract does not support the `IPlugin` interface.

```solidity
error IPluginNotSupported(address plugin) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `plugin` | `address` | The address of the contract. |

###  error PluginRepoNonexistent

Thrown if a plugin repository does not exist on the plugin repo registry.

```solidity
error PluginRepoNonexistent() 
```

###  error SetupAlreadyPrepared

Thrown if a plugin setup was already prepared indicated by the prepared setup ID.

```solidity
error SetupAlreadyPrepared(bytes32 preparedSetupId) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `preparedSetupId` | `bytes32` | The prepared setup ID. |

###  error SetupNotApplicable

Thrown if a prepared setup ID is not eligible to be applied. This can happen if another setup has been already applied or if the setup wasn't prepared in the first place.

```solidity
error SetupNotApplicable(bytes32 preparedSetupId) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `preparedSetupId` | `bytes32` | The prepared setup ID. |

###  error InvalidUpdateVersion

Thrown if the update version is invalid.

```solidity
error InvalidUpdateVersion(struct PluginRepo.Tag currentVersionTag, struct PluginRepo.Tag newVersionTag) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `currentVersionTag` | `struct PluginRepo.Tag` | The tag of the current version to update from. |
| `newVersionTag` | `struct PluginRepo.Tag` | The tag of the new version to update to. |

###  error PluginAlreadyInstalled

Thrown if plugin is already installed and one tries to prepare or apply install on it.

```solidity
error PluginAlreadyInstalled() 
```

###  error InvalidAppliedSetupId

Thrown if the applied setup ID resulting from the supplied setup payload does not match with the current applied setup ID.

```solidity
error InvalidAppliedSetupId(bytes32 currentAppliedSetupId, bytes32 appliedSetupId) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `currentAppliedSetupId` | `bytes32` | The current applied setup ID with which the data in the supplied payload must match. |
| `appliedSetupId` | `bytes32` | The applied setup ID obtained from the data in the supplied setup payload. |

###  event InstallationPrepared

Emitted with a prepared plugin installation to store data relevant for the application step.

```solidity
event InstallationPrepared(address sender, address dao, bytes32 preparedSetupId, contract PluginRepo pluginSetupRepo, struct PluginRepo.Tag versionTag, bytes data, address plugin, struct IPluginSetup.PreparedSetupData preparedSetupData) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `sender` | `address` | The sender that prepared the plugin installation. |
| `dao` | `address` | The address of the DAO to which the plugin belongs. |
| `preparedSetupId` | `bytes32` | The prepared setup ID obtained from the supplied data. |
| `pluginSetupRepo` | `contract PluginRepo` | The repository storing the `PluginSetup` contracts of all versions of a plugin. |
| `versionTag` | `struct PluginRepo.Tag` | The version tag of the plugin setup of the prepared installation. |
| `data` | `bytes` | The bytes-encoded data containing the input parameters for the preparation as specified in the corresponding ABI on the version's metadata. |
| `plugin` | `address` | The address of the plugin contract. |
| `preparedSetupData` | `struct IPluginSetup.PreparedSetupData` | The deployed plugin's relevant data which consists of helpers and permissions. |

###  event InstallationApplied

Emitted after a plugin installation was applied.

```solidity
event InstallationApplied(address dao, address plugin, bytes32 preparedSetupId, bytes32 appliedSetupId) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `dao` | `address` | The address of the DAO to which the plugin belongs. |
| `plugin` | `address` | The address of the plugin contract. |
| `preparedSetupId` | `bytes32` | The prepared setup ID. |
| `appliedSetupId` | `bytes32` | The applied setup ID. |

###  event UpdatePrepared

Emitted with a prepared plugin update to store data relevant for the application step.

```solidity
event UpdatePrepared(address sender, address dao, bytes32 preparedSetupId, contract PluginRepo pluginSetupRepo, struct PluginRepo.Tag versionTag, struct IPluginSetup.SetupPayload setupPayload, struct IPluginSetup.PreparedSetupData preparedSetupData, bytes initData) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `sender` | `address` | The sender that prepared the plugin update. |
| `dao` | `address` | The address of the DAO to which the plugin belongs. |
| `preparedSetupId` | `bytes32` | The prepared setup ID. |
| `pluginSetupRepo` | `contract PluginRepo` | The repository storing the `PluginSetup` contracts of all versions of a plugin. |
| `versionTag` | `struct PluginRepo.Tag` | The version tag of the plugin setup of the prepared update. |
| `setupPayload` | `struct IPluginSetup.SetupPayload` | The payload containing the plugin and helper contract addresses deployed in a preparation step as well as optional data to be consumed by the plugin setup. |
| `preparedSetupData` | `struct IPluginSetup.PreparedSetupData` | The deployed plugin's relevant data which consists of helpers and permissions. |
| `initData` | `bytes` | The initialization data to be passed to the upgradeable plugin contract. |

###  event UpdateApplied

Emitted after a plugin update was applied.

```solidity
event UpdateApplied(address dao, address plugin, bytes32 preparedSetupId, bytes32 appliedSetupId) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `dao` | `address` | The address of the DAO to which the plugin belongs. |
| `plugin` | `address` | The address of the plugin contract. |
| `preparedSetupId` | `bytes32` | The prepared setup ID. |
| `appliedSetupId` | `bytes32` | The applied setup ID. |

###  event UninstallationPrepared

Emitted with a prepared plugin uninstallation to store data relevant for the application step.

```solidity
event UninstallationPrepared(address sender, address dao, bytes32 preparedSetupId, contract PluginRepo pluginSetupRepo, struct PluginRepo.Tag versionTag, struct IPluginSetup.SetupPayload setupPayload, struct PermissionLib.MultiTargetPermission[] permissions) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `sender` | `address` | The sender that prepared the plugin uninstallation. |
| `dao` | `address` | The address of the DAO to which the plugin belongs. |
| `preparedSetupId` | `bytes32` | The prepared setup ID. |
| `pluginSetupRepo` | `contract PluginRepo` | The repository storing the `PluginSetup` contracts of all versions of a plugin. |
| `versionTag` | `struct PluginRepo.Tag` | The version tag of the plugin to used for install preparation. |
| `setupPayload` | `struct IPluginSetup.SetupPayload` | The payload containing the plugin and helper contract addresses deployed in a preparation step as well as optional data to be consumed by the plugin setup. |
| `permissions` | `struct PermissionLib.MultiTargetPermission[]` | The list of multi-targeted permission operations to be applied to the installing DAO. |

###  event UninstallationApplied

Emitted after a plugin installation was applied.

```solidity
event UninstallationApplied(address dao, address plugin, bytes32 preparedSetupId) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `dao` | `address` | The address of the DAO to which the plugin belongs. |
| `plugin` | `address` | The address of the plugin contract. |
| `preparedSetupId` | `bytes32` | The prepared setup ID. |

### internal modifier canApply

A modifier to check if a caller has the permission to apply a prepared setup.

```solidity
modifier canApply(address _dao, bytes32 _permissionId) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `address` | The address of the DAO. |
| `_permissionId` | `bytes32` | The permission identifier. |

### public function constructor

Constructs the plugin setup processor by setting the associated plugin repo registry.

```solidity
constructor(contract PluginRepoRegistry _repoRegistry) public 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_repoRegistry` | `contract PluginRepoRegistry` | The plugin repo registry contract. |

### external function prepareInstallation

Prepares the installation of a plugin.

```solidity
function prepareInstallation(address _dao, struct PluginSetupProcessor.PrepareInstallationParams _params) external returns (address plugin, struct IPluginSetup.PreparedSetupData preparedSetupData) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `address` | The address of the installing DAO. |
| `_params` | `struct PluginSetupProcessor.PrepareInstallationParams` | The struct containing the parameters for the `prepareInstallation` function. |
| **Output** | |
|  `plugin`  | `address` | The prepared plugin contract address. |
|  `preparedSetupData`  | `struct IPluginSetup.PreparedSetupData` | The data struct containing the array of helper contracts and permissions that the setup has prepared. |

### external function applyInstallation

Applies the permissions of a prepared installation to a DAO.

```solidity
function applyInstallation(address _dao, struct PluginSetupProcessor.ApplyInstallationParams _params) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `address` | The address of the installing DAO. |
| `_params` | `struct PluginSetupProcessor.ApplyInstallationParams` | The struct containing the parameters for the `applyInstallation` function. |

### external function prepareUpdate

Prepares the update of an UUPS upgradeable plugin.

```solidity
function prepareUpdate(address _dao, struct PluginSetupProcessor.PrepareUpdateParams _params) external returns (bytes initData, struct IPluginSetup.PreparedSetupData preparedSetupData) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `address` | The address of the DAO For which preparation of update happens. |
| `_params` | `struct PluginSetupProcessor.PrepareUpdateParams` | The struct containing the parameters for the `prepareUpdate` function. |
| **Output** | |
|  `initData`  | `bytes` | The initialization data to be passed to upgradeable contracts when the update is applied |
|  `preparedSetupData`  | `struct IPluginSetup.PreparedSetupData` | The data struct containing the array of helper contracts and permissions that the setup has prepared. |

*The list of `_params.setupPayload.currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the update is prepared for.*
### external function applyUpdate

Applies the permissions of a prepared update of an UUPS upgradeable proxy contract to a DAO.

```solidity
function applyUpdate(address _dao, struct PluginSetupProcessor.ApplyUpdateParams _params) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `address` | The address of the updating DAO. |
| `_params` | `struct PluginSetupProcessor.ApplyUpdateParams` | The struct containing the parameters for the `applyInstallation` function. |

### external function prepareUninstallation

Prepares the uninstallation of a plugin.

```solidity
function prepareUninstallation(address _dao, struct PluginSetupProcessor.PrepareUninstallationParams _params) external returns (struct PermissionLib.MultiTargetPermission[] permissions) 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `address` | The address of the uninstalling DAO. |
| `_params` | `struct PluginSetupProcessor.PrepareUninstallationParams` | The struct containing the parameters for the `prepareUninstallation` function. |
| **Output** | |
|  `permissions`  | `struct PermissionLib.MultiTargetPermission[]` | The list of multi-targeted permission operations to be applied to the uninstalling DAO. |

*The list of `_params.setupPayload.currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the uninstallation was prepared for.*
### external function applyUninstallation

Applies the permissions of a prepared uninstallation to a DAO.

```solidity
function applyUninstallation(address _dao, struct PluginSetupProcessor.ApplyUninstallationParams _params) external 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `_dao` | `address` | The address of the DAO. |
| `_params` | `struct PluginSetupProcessor.ApplyUninstallationParams` | The struct containing the parameters for the `applyUninstallation` function. |

*The list of `_params.setupPayload.currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which the uninstallation was prepared for.*
### public function validatePreparedSetupId

Validates that a setup ID can be applied for `applyInstallation`, `applyUpdate`, or `applyUninstallation`.

```solidity
function validatePreparedSetupId(bytes32 pluginInstallationId, bytes32 preparedSetupId) public view 
```

| Input | Type | Description |
|:----- | ---- | ----------- |
| `pluginInstallationId` | `bytes32` | The plugin installation ID obtained from the hash of `abi.encode(daoAddress, pluginAddress)`. |
| `preparedSetupId` | `bytes32` | The prepared setup ID to be validated. |

*If the block number stored in `states[pluginInstallationId].blockNumber` exceeds the one stored in `pluginState.preparedSetupIdToBlockNumber[preparedSetupId]`, the prepared setup with `preparedSetupId` is outdated and not applicable anymore.*
<!--CONTRACT_END-->

