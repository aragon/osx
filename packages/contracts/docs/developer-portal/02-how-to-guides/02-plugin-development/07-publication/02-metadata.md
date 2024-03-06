---
title: Plugin Metadata
---

## Plugin Metadata Specification

The plugin metadata is necessary to allow the App frontend to interact with any plugins:

- Now: generic setup (installation, update, uninstallation)
  - Allows the frontend to render the necessary fields for the input being required to setup the plugin (e.g., the list of initial members of the Multisig plugin)
- Future: render a UI in a generic way (buttons, text fields, flows) within the specs of the Open Design System (ODS) (e.g. manage the list of Multisig members or the approval settings)

Currently, two kinds of metadata exist:

1. Release metadata
2. Build metadata

### Release Metadata

The release metadata is a `.json` file stored on IPFS with its IPFS CID published for each release in the [PluginRepo](../../../01-how-it-works/02-framework/02-plugin-management/01-plugin-repo/index.md) (see also the section about [versioning](../07-publication/01-versioning.md#)).

The intention is to provide an appealing overview of each releases functionality.
It can be updated with each call to [`createVersion()`](../../../03-reference-guide/framework/plugin/repo/IPluginRepo.md#external-function-createversion) in `IPluginRepo` by the repo maintainer.
It can be replaced at any time with [`updateReleaseMetadata()`](../../../03-reference-guide/framework/plugin/repo/IPluginRepo.md#external-function-updatereleasemetadata) in `IPluginRepo` by the repo maintainer.

The `release-metadata.json` file consists of the following entries:

| Key         | Type        | Description                                                                  |
| ----------- | ----------- | ---------------------------------------------------------------------------- |
| name        | `string`    | Name of the plugin (e.g. `"Multisig"`)                                       |
| description | `string`    | Description of the plugin release and its functionality.                     |
| images      | UNSPECIFIED | Optional. Contains a series of images advertising the plugins functionality. |

#### Example

```json
{
  "name": "Multisig",
  "description": "",
  "images": {}
}
```

### Build Metadata

The build metadata is a `.json` file stored on IPFS with its IPFS CID published for each build **only once** in the [PluginRepo](../../../01-how-it-works/02-framework/02-plugin-management/01-plugin-repo/index.md) (see also the section about [versioning](../07-publication/01-versioning.md#)).

The intention is to inform about the changes that were introduced in this build compared to the previous one and give instructions to the App frontend and other users on how to interact with the plugin setup and implementation contract.
It can be published **only once** with the call to [`createVersion()`](../../../03-reference-guide/framework/plugin/repo/IPluginRepo.md#external-function-createversion) in `IPluginRepo` by the repo maintainer.

| Key         | Type        | Description                                                                                               |
| ----------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| ui          | UNSPECIFIED | A special formatted object containing instructions for the App frontend on how to render the plugin's UI. |
| change      | `string`    | Description of the code and UI changes compared to the previous build of the same release.                |
| pluginSetup | `object`    | Optional. Contains a series of images advertising the plugins functionality.                              |

Each build metadata contains the following fields:

- one `"prepareInstallation"` object
- one `"prepareUninstallation"` object
- 0 to N `"prepareUpdate"` objects enumerated from 1 to N+1

Each `"prepare..."` object contains:

| Key         | Type       | Description                                                                                                                                                                                                                                    |
| ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| description | `string`   | The description of what this particular setup step is doing and what it requires the input for.                                                                                                                                                |
| inputs      | `object[]` | A description of the inputs required for this setup step following the [Solidity JSON ABI](https://docs.ethers.org/v5/api/utils/abi/formats/#abi-formats--solidity) format enriched with an additional `"description"` field for each element. |

By following the Solidity JSON ABI format for the inputs, we followed an establishd standard, have support for complex types (tuples, arrays, nested versions of the prior) and allow for future extensibility (such as the human readable description texts that we have added).

#### Example

```json
{
  "ui": {},
  "change": "- The ability to create a proposal now depends on the membership status of the current instead of the snapshot block.\n- Added a check ensuring that the initial member list cannot overflow.",
  "pluginSetup": {
    "prepareInstallation": {
      "description": "The information required for the installation.",
      "inputs": [
        {
          "internalType": "address[]",
          "name": "members",
          "type": "address[]",
          "description": "The addresses of the initial members to be added."
        },
        {
          "components": [
            {
              "internalType": "bool",
              "name": "onlyListed",
              "type": "bool",
              "description": "Whether only listed addresses can create a proposal or not."
            },
            {
              "internalType": "uint16",
              "name": "minApprovals",
              "type": "uint16",
              "description": "The minimal number of approvals required for a proposal to pass."
            }
          ],
          "internalType": "struct Multisig.MultisigSettings",
          "name": "multisigSettings",
          "type": "tuple",
          "description": "The inital multisig settings."
        }
      ],
      "prepareUpdate": {
        "1": {
          "description": "No input is required for the update.",
          "inputs": []
        }
      },
      "prepareUninstallation": {
        "description": "No input is required for the uninstallation.",
        "inputs": []
      }
    }
  }
}
```
