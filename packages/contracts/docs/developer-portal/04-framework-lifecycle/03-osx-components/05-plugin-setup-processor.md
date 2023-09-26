# `PluginSetupProcessor`

```mermaid
flowchart TD
    processStart("Process Name")
    processStart ==> implementation
    subgraph implementation[Implementation]
        nonUpgradeableContractImplementation[[<a href='./03-non-upgradeable-contract.md'>non-upgradeable \n contract change</a>]]
        ensureCompatibility["ensure backwards compat- \n ibilitywith active setups"]

        nonUpgradeableContractImplementation --> ensureCompatibility
    end

    implementation ==> testing[<a href='../03-sub-processes/03-testing.md'>Testing</a>]
    %%subgraph testing[Testing]
    %%end

    testing ==> docs[<a href='../03-sub-processes/04-documentation.md'>Documentation</a>]
    %%subgraph testing[Testing]
    %%end

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

        announceUpdate["Announce Update"]
        revokeApplyPermissions["create proposal to grant/revoke \n APPLY...PERMISSION to/from \n new/old PluginSetupProcessor"]

        sdkUpdate -->|yes| appUpdate
        appUpdate--> announceUpdate
        announceUpdate --> revokeApplyPermissions
    end

    rollout ==> processEnd("Done")
```

## Ensuring backwards compatibility

- ensure backwards compatibility with old setups
  - use the old `mapping(bytes32 => PluginState) public states;` mapping
  - Update Subgraph & SDK to be able to handle both old & new `PluginSetupProcessor`

## Roll-Out

Use the new contract in the Aragon CLI.
