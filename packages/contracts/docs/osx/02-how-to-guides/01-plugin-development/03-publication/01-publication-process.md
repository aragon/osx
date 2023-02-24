---
title: Publication Process
---

## Publishing Your Plugin

:::note
Work in Progress
:::

- call `createPluginRepoWithFirstVersion` in `PluginRepoFactory`
- this creates the `PluginRepo` with a `1.0` version release and registers it in the `PluginRepoRegistry` with an ENS name

for all subsequent builds and releases, `createVersion` inside the registered `PluginRepo` has to be called.
