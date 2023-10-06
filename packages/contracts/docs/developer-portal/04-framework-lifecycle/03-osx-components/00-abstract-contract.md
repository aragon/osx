# Abstract Contract Change

Applies to:

- `PermissionManager`
- `CallbackHandler`
- `DaoAuthorizable` and `DaoAuthorizableUpgradeable`
- `Proposal` and `ProposalUpgradeable`

```mermaid
flowchart TD
    processStart("Abstract Contract Change")
    processStart ==> implementation
    subgraph implementation[Implementation]
        bumpProtocolVersion[["<a href='../03-sub-processes/01-protocol-version.md'>Bump protocol version</a>"]]
        isUpgradeable{"is UUPS \n upgradeable?"}
        upgradeableContractImplementation[[<a href='./02-upgradeable-contract.md'>UUPS upgradeable \n contract change</a>]]
        nonUpgradeableContractImplementation[[<a href='./03-non-upgradeable-contract.md'>non-upgradeable \n contract change</a>]]
        affectsInitialization{"affects \n initialization?"}
        adaptInitialization[["<a href='../03-sub-processes/02-contract-initialization.md'adapt initialization> adapt initialization</a>\n in inheriting contract"]]

        bumpProtocolVersion --> isUpgradeable
        isUpgradeable -->|yes| upgradeableContractImplementation --> affectsInitialization
        isUpgradeable -->|no| nonUpgradeableContractImplementation --> affectsInitialization
        affectsInitialization -->|yes| adaptInitialization
    end

    implementation ==> testing[[<a href='../03-sub-processes/03-testing.md'>Testing</a>]]
    %%subgraph testing[Testing]
    %%end


    testing ==> docs[[<a href='../03-sub-processes/04-documentation.md'>Documentation</a>]]
    %%subgraph testing[Testing]
    %%end

    docs ==> deployment
    subgraph deployment[Deployment]
        updateDerivedContracts["upgrade / redeploy \n inheriting contracts"]
    end

    deployment ==> processEnd("Done")
```
