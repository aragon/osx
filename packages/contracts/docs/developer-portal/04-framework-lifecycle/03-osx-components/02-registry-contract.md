# Registry Contract Change

Applies to

- `DAORegistry`
- `PluginRepoRegistry`

```mermaid
flowchart TD
    processStart("Registry change")
    processStart ==> implementation
    subgraph implementation[Implementation]
        bumpProtocolVersion[["<a href='../03-sub-processes/protocol-version.md'>Bump protocol version</a>"]]
        upgradeableContractImplementation[[<a href='../03-sub-processes/upgradeable-contract.md'>UUPS upgradeable contract \n change</a>]]

        bumpProtocolVersion --> upgradeableContractImplementation
    end

    implementation ==> testing[[<a href='../03-sub-processes/testing.md'>Testing</a>]]
    %%subgraph testing[Testing]
    %%end

    testing ==> docs[[<a href='../03-sub-processes/documentation.md'>Documentation</a>]]
    %%subgraph testing[Testing]
    %%end

    docs ==> deployment
    subgraph deployment[Deployment]
        affectsPermissions{"affects \n permissions?"}

        subgraph managingDaoProposal["Managing DAO Proposal"]
            grantNewPermissions["grant new permissions \n to registry users"]
            revokeOldPermissions["revoke old permissions \n from registry users"]
        end

       affectsPermissions -->|yes| managingDaoProposal
    end

    deployment ==> rollout
    subgraph rollout[Roll-out]
        %% todo
    end

    rollout ==> processEnd("Done")
```
