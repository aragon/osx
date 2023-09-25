# Plugin Build

```mermaid
flowchart TD
    processStart("Plugin Build")
    processStart ==> implementation
    subgraph implementation[Implementation]
        isUpgradeable{"is UUPS \n upgradeable?"}
        upgradeableContractImplementation[[<a href='../03-sub-processes/upgradeable-contract.md'>UUPS upgradeable \n contract change</a>]]
        nonUpgradeableContractImplementation[[<a href='../03-sub-processes/non-upgradeable-contract.md'>non-upgradeable \n contract change</a>]]
        adaptPluginSetup[[<a href='./plugin-setup.md'>implement PluginSetup</a>]]
        isUpgradeable -->|yes| upgradeableContractImplementation --> adaptPluginSetup
        isUpgradeable -->|no| nonUpgradeableContractImplementation --> adaptPluginSetup

    end

    implementation ==> testing[<a href='../03-sub-processes/testing.md'>Testing</a>]
    %%subgraph testing[Testing]
    %%end

    testing ==> docs[<a href='../03-sub-processes/documentation.md'>Documentation</a>]
    %%subgraph testing[Testing]
    %%end

    docs ==> deployment
    subgraph deployment[Deployment]
        deployViaSetup[["deploy the build \n in the associated \n PluginSetup"]]
    end

    deployment ==> rollout
    subgraph rollout[Roll-out]
        publishPluginSetup[[<a href='plugin-setup.md'>publish PluginSetup</a>]]
    end

    rollout ==> processEnd("Done")
```
