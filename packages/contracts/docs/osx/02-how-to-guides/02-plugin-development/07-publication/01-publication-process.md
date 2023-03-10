---
title: Publication Process
---

## Publishing Your Plugin

:::note
Work in Progress
:::

- call `createPluginRepoWithFirstVersion` in `PluginRepoFactory`
- this creates the `PluginRepo` with a version release 1 and build 1 (`v1.1`) and registers it in the `PluginRepoRegistry` with an ENS name

for all subsequent builds and releases, `createVersion` inside the registered `PluginRepo` has to be called.
