---
title: How It Works
---

## The aragonOS DAO Framework

The aragonOS DAO framework is structured as follows

<div class="center-column">

![](./aragon-os-framework-overview.drawio.svg)

<p class="caption"> 
  Overview of the aragonOS DAO framework with its structural components; the governance layer, code layer with external dependencies; and their responsibilities.
</p>

</div>

### Code Layer

The foundation of the aragonOS DAO Framework is the **code layer** constituted by the core and infrastructure related contracts.
The [core contracts](01-index.md) provide the core primitives intended to be used by users and implemented by developers of the DAO framework.
The [framework contracts](02-framework/index.md) provide the infrastructure to easily create and manage your DAOs and plugins easy.
Both are built on top of external dependencies, most notably the [OpenZepplin](https://www.openzeppelin.com/contracts) and the [Ethereum Name Service (ENS)](https://docs.ens.domains/) contracts.

### Governance Layer

To govern the framework infrastructure, an aragonOS [Framework DAO](03-framework-dao.md) is deployed constituting the **governance layer** of the DAO framework.

In the next sections, you will learn more about the individual components of the framework.
