---
title: Submission
---

## The Plugin Submission Process

:::note
To do: This is a draft.
:::

To be displayed on Aragon's plugin repository, plugins have to be submitted.

- call `createPluginRepoWithFirstVersion` in `PluginRepoFactory`
- this creates the `PluginRepo` with a `1.0` version release and registers it in the `PluginRepoRegistry` with an ENS name

For all subsequent builds and releases, `createVersion` inside the registered `PluginRepo` has to be called.
