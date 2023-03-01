---
title: How It Works
---

## The Aragon OSx DAO Framework

The Aragon OSx DAO framework is structured as follows:

<div class="center-column">

![](./aragon-os-framework-overview.drawio.svg)

<p class="caption"> 
  Overview of the Aragon OSx protocol with its structural components and their responsibilities: the governance layer constituted by the framework DAO, the code layer including the framework and core contracts, which depends on external libraries and services.
</p>

</div>

### Code Layer

The foundation of the Aragon OSx protocol is the **code layer** constituted by the core and framework related contracts.
The [core contracts](./01-core/index.md) provide the core primitives intended to be used by users and implemented by developers of the DAO framework.
The [framework contracts](./02-framework/index.md) provide the infrastructure to easily create and manage your DAOs and plugins easy.
Both are built on top of external dependencies, most notably the [OpenZepplin](https://www.openzeppelin.com/contracts) and the [Ethereum Name Service (ENS)](https://docs.ens.domains/) contracts.

The core and framework contracts are free to use, and no additional fees are charged.

### Governance Layer

To govern the framework infrastructure, an Aragon OSx [Framework DAO](./03-framwork-dao.md) is deployed constituting the **governance layer** of the Aragon OSx protocol.

In the next sections, you will learn more about the individual components of the framework.
