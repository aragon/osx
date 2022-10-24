---
title: Version Numbers
---

## Using Semantic Versioning for Your Plugin

:::note
Work in Progress
:::

<!--TODO: This needs a core team discussion-->

Our plugin version numbering follows the common [semantic versioning](https://semver.org/) notation. Below, we define what a version bumps means in the context of the `Plugin` ecosystem.

Given a version number `MAJOR.MINOR.PATCH`, we can infer that:

1. We’re doing a `MAJOR` version when we make incompatible API changes.
   - For smart contracts this could be
     - a change of a function signature
     - the repurposing of existing storage
2. We’re doing a `MINOR` version when we add functionality in a backwards compatible manner.
   - For smart contracts this could be
     - the addition of functions
     - the addition of new storage variables
3. We’re doing a `PATCH` version when we make backwards compatible bug fixes.
   - For smart contracts this could be a
     - a bug fix in the contract logic
     - a bug fix in the contract factory
   - For the UI, a minor change is also included as a patch.
