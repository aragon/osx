---
title: The DAO Framework
---

## The Infrastructure Behind the AraongOS DAO Framework

The AragonOS DAO Framework provides **infrastructure-related contracts** for the **creation of DAOs** and the **management of the Aragon plugin repository**.

<div class="center-column">

![](aragon-os-framework-overview.drawio.svg)

<p class="caption"> 
  Overview of the aragonOS DAO Framework with its components; the governance layer, code layer with external dependencies; and their responsibilities.
</p>

</div>

Together, the core and infrastructure related contracts constitute the **code layer** of our aragonOS DAO framework that is built on top of external dependencies, most notably the [OpenZepplin contracts](https://www.openzeppelin.com/contracts).
To govern the framework infrastructure, a **Framework DAO** exists.
The Framework DAO controls the permissions of and between the infrastructure-related contracts required to configure and maintain them as well as to replace or upgrade them.

This Framework DAO constitutes the **governance layer** of the aragonOS DAO Framework.

In the following sections, [The DAO Creation Process](01-dao-creation-process.md) and the [The Aragon Plugin Repository](02-plugin-repository/index.md) are explained in more detail.
