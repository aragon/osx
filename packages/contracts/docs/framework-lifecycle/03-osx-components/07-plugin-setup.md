# Plugin Setup

```mermaid
flowchart TD
    processStart("Publish a PluginSetup")
    processStart ==> implementation
    subgraph implementation[Implementation]
        implementPrepareInstallation[["implement \n prepareInstallation()"]]
        implementPrepareUninstallation[["implement \n prepareUninstallation()"]]
        isUpgradeable{"UUPS upgrade- \n able plugin?"}
        implementPrepareUpdate[["implement \n prepareUpdate()"]]
        updateMetadata[["update metadata"]]

        implementPrepareInstallation --> implementPrepareUninstallation
        implementPrepareUninstallation --> isUpgradeable
        isUpgradeable -->|yes| implementPrepareUpdate --> updateMetadata
        isUpgradeable -->|no| updateMetadata
    end

    implementation ==> testing[[<a href='https://github.com/aragon/osx/blob/develop/packages/contracts/docs/developer-portal/04-framework-lifecycle/04-sub-processes/03-testing.md'>Testing</a>]]
    %%subgraph testing[Testing]
    %%end

    testing ==> docs[[<a href='https://github.com/aragon/osx/blob/develop/packages/contracts/docs/developer-portal/04-framework-lifecycle/04-sub-processes/04-documentation.md'>Documentation</a>]]
    %%subgraph testing[Testing]
    %%end

    docs ==> deployment
    subgraph deployment[Deployment]

    end

    deployment ==> rollout
    subgraph rollout[Roll-out]
        isAragonPlugin{"is Aragon \n plugin?"}
        managingDaoProposal["management DAO \n proposal"]
        announceUpdate[["<a href='https://github.com/aragon/osx/blob/develop/packages/contracts/docs/developer-portal/04-framework-lifecycle/04-sub-processes/06-aragon-update.md'>announce Aragon update</a>"]]

        publishToAragonPluginRepo["publish PluginSetup \n in Aragon PluginRepo"]
        publishToPluginRepo["publish  PluginSetup \n in 3rd-party repo"]

        isAragonPlugin -->|yes| managingDaoProposal --> publishToAragonPluginRepo --> announceUpdate
        isAragonPlugin --->|no| publishToPluginRepo

    end

    rollout ==> processEnd("Done")
```

## Implement `prepareInstallation`

Conduct all necessary actions to prepare the installation of a plugin.

- decode `_data` if required
- deploy the plugin (proxy) contract and return its address
- deploy helpers and return their addresses via the `preparedSetupData.helpers` array of addresses.
- request new permissions to be granted and return them via the `preparedSetupData.permissions` array of permission structs.

## Implement `prepareUninstallation`

Conduct all necessary actions to prepare the uninstallation of a plugin and to decommission it.

- decode `_payload._data` if required

- request existing permissions to be revoked and return them via the `preparedSetupData.permissions` array of permission structs.

## Implement `prepareUpdate`

- decode `_payload._data` if required
- return initialization data to be used with `upgradeToAndCall`
- transition

  - the `SetupPayload.plugin` contract
  - `SetupPayload.currentHelpers` contracts
  - and existing permission

  over from the `_currentBuild` to the new build by

  - deploying / decommissioning helpers return the addresses of the prevailing ones via the `preparedSetupData.helpers` array of addresses.
  - requesting to grant new / revoke existing permissions and returning them via the `preparedSetupData.permissions` array of permission structs.

## Update Metadata

- specify the encoding of `_data` / `_payload._data` for `prepareInstallation` / `prepareUninstallation` / `prepareUpdate` in the `build-metadata.json` file accompanying the setup according to the [metadata specs](../../02-how-to-guides/02-plugin-development/07-publication/02-metadata.md).
