# `PluginSetupProcessor`

```mermaid
flowchart TD
    processStart("PluginSetupProcessor change")
    processStart ==> implementation
    subgraph implementation[Implementation]
        nonUpgradeableContractImplementation[[<a href='https://github.com/aragon/osx/blob/develop/packages/contracts/docs/developer-portal/04-framework-lifecycle/03-osx-components/03-non-upgradeable-contract.md'>non-upgradeable \n contract change</a>]]
        ensureCompatibility["ensure backwards compat- \n ibility with active setups"]

        nonUpgradeableContractImplementation --> ensureCompatibility
    end

    implementation ==> testing[<a href='https://github.com/aragon/osx/blob/develop/packages/contracts/docs/developer-portal/04-framework-lifecycle/04-sub-processes/03-testing.md'>Testing</a>]

    testing ==> docs[<a href='https://github.com/aragon/osx/blob/develop/packages/contracts/docs/developer-portal/04-framework-lifecycle/04-sub-processes/04-documentation.md'>Documentation</a>]

    docs ==> deployment
    subgraph deployment[Deployment]
        deployContract["deploy the contract"]
        redeployDaoFactory[[<a href='factory-contract.md'>redeploy DAOFactory</a>]]
        deploySubgraph["deploy Subgraph  \n indexing the old and new \n PluginSetupProcessor"]
        deployContract --> redeployDaoFactory --> deploySubgraph
    end

    deployment ==> rollout
    subgraph rollout[Roll-out]
        sdkUpdate["update SDK"]
        appUpdate["update App"]

        revokeApplyPermissions["create proposal to grant/revoke \n APPLY...PERMISSION to/from \n new/old PluginSetupProcessor"]

        sdkUpdate -->|yes| appUpdate
        appUpdate --> revokeApplyPermissions
    end

    rollout ==> processEnd("Done")
```

## Ensuring backwards compatibility

Active setups are maintained in the [`mapping(bytes32 pluginInstallationId => PluginState data) public states;` mapping](../../03-reference-guide/framework/plugin/setup/PluginSetupProcessor.md#public-variable-states).
The old public mapping in the outdated `PluginSetupProcessor` can be read and accessed in the new one to ensure active plugins can still be updated or uninstalled.

Make sure to also update the Subgraph and SDK to be able to handle both old & new `PluginSetupProcessor`

## Roll-Out

Use the new `PluginSetupProcessor` in the Aragon CLI.
