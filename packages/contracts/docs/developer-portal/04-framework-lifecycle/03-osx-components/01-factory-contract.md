# Factory Change

```mermaid
flowchart TD
    processStart("Factory Change")

    processStart ==> implementation
    subgraph implementation[Implementation]

        %% Standard Checks
        bumpProtocolVersion[["<a href='https://github.com/aragon/osx/blob/develop/packages/contracts/docs/developer-portal/04-framework-lifecycle/04-sub-processes/01-protocol-version.md'>Bump protocol version</a>"]]
        isBaseChange{"is base imple- \n mentation  change?"}

        %% Actions
        deployNewImplementation["deploy new implementation \n contract through constructor"]
        reuseOldImplementation["reuse old implementation \n contract through constructor"]
        adaptConstructor["adapt the constructor"]

        %% Base Change
        bumpProtocolVersion --> isBaseChange
        isBaseChange -->|yes| deployNewImplementation
        isBaseChange -->|no| reuseOldImplementation
        deployNewImplementation-->adaptConstructor
        reuseOldImplementation-->adaptConstructor

    end

    implementation ==> testing[[<a href='https://github.com/aragon/osx/blob/develop/packages/contracts/docs/developer-portal/04-framework-lifecycle/04-sub-processes/03-testing.md'>Testing</a>]]

    testing ==> docs[[<a href='https://github.com/aragon/osx/blob/develop/packages/contracts/docs/developer-portal/04-framework-lifecycle/04-sub-processes/04-documentation.md'>Documentation</a>]]


    docs ==> deployment
    subgraph deployment[Deployment]
        deployContract[[<a href='https://github.com/aragon/osx/blob/develop/packages/contracts/docs/developer-portal/04-framework-lifecycle/04-sub-processes/05-deployment.md'>standard deployment process</a>]]
        deployContract --> managingDaoProposal

        subgraph managingDaoProposal["Managing DAO Proposal"]
            grantNewPermissions["grant registry permission \n for the new factory"]
            revokeOldPermissions["revoke registry permission \n from the old factory"]
        end
    end

    deployment ==> rollout
    subgraph rollout[Roll-out]

        sdkUpdate["update SDK"]
        affectsSDK{"affects SDK?"}
        affectsSDK -->|yes| sdkUpdate --> affectsApp
        affectsSDK -->|no| affectsApp

        appUpdate["update App"]
        affectsApp{"affects App?"}
        affectsApp -->|yes| appUpdate --> announceUpdate
        affectsApp -->|no| announceUpdate

        announceUpdate[["<a href='https://github.com/aragon/osx/blob/develop/packages/contracts/docs/developer-portal/04-framework-lifecycle/04-sub-processes/06-aragon-update.md'>announce Aragon update</a>"]]
        announceUpdate

    end

    rollout ==> processEnd("Done")
```

Applies to

- `DAOFactory`
- `PluginRepoFactory`

For changes in the underlying implementations (i.e., `DAO` and `PluginRepo`), see the process of [replacing upgradeable contracts](./02-upgradeable-contract.md).
