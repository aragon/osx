---
title: Framework
---

## The Infrastructure Running the Araong OSx Protocol

The Aragon OSx protocol is composed of **framework-related contracts** creating and managing the **core contracts**. This includes the

- [Creation of DAOs](01-dao-creation/index.md) and initial plugin configuration
- [Management of plugins](02-plugin-management/index.md), which includes the

  - The setup in existing DAOs
  - The versioning of different implementations and respective setup contracts, UI, and related metadata

- [Assignment of ENS Names](./03-ens-names.md) to `Plugin` and `DAO` contracts created through the framework

An overview of the involved contracts and their interactions is shown below:

<div class="center-column">

![](aragon-os-infrastructure-core-overview.drawio.svg)

<p class="caption"> 
  Overview of the framework and core contracts of the Aragon OSx protocol.
</p>

</div>

In the following sections, you will learn more about the framework-related contracts of the Aragon OSx protocol.
