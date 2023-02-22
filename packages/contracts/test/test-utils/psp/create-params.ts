import {BytesLike} from 'ethers';

import {hashHelpers} from '../../../utils/psp';
import {PermissionOperation, PluginRepoPointer, VersionTag} from './types';

export function createPrepareInstallationParams(
  pluginRepoPointer: PluginRepoPointer,
  data: BytesLike
) {
  return {
    pluginSetupRef: {
      pluginSetupRepo: pluginRepoPointer[0],
      versionTag: {
        release: pluginRepoPointer[1],
        build: pluginRepoPointer[2],
      },
    },
    data: data,
  };
}

export function createApplyInstallationParams(
  plugin: string,
  pluginRepoPointer: PluginRepoPointer,
  permissions: PermissionOperation[],
  helpers: string[]
) {
  return {
    plugin: plugin,
    pluginSetupRef: {
      pluginSetupRepo: pluginRepoPointer[0],
      versionTag: {
        release: pluginRepoPointer[1],
        build: pluginRepoPointer[2],
      },
    },
    permissions: permissions,
    helpersHash: hashHelpers(helpers),
  };
}

export function createPrepareUpdateParams(
  plugin: string,
  currentVersionTag: VersionTag,
  newVersionTag: VersionTag,
  pluginSetupRepo: string,
  helpers: string[],
  data: BytesLike
) {
  return {
    currentVersionTag: {
      release: currentVersionTag[0],
      build: currentVersionTag[1],
    },
    newVersionTag: {
      release: newVersionTag[0],
      build: newVersionTag[1],
    },
    pluginSetupRepo: pluginSetupRepo,
    setupPayload: {
      plugin: plugin,
      currentHelpers: helpers,
      data: data,
    },
  };
}

export function createApplyUpdateParams(
  plugin: string,
  pluginRepoPointer: PluginRepoPointer,
  initData: BytesLike,
  permissions: PermissionOperation[],
  helpers: string[]
) {
  return {
    plugin: plugin,
    permissions: permissions,
    pluginSetupRef: {
      pluginSetupRepo: pluginRepoPointer[0],
      versionTag: {
        release: pluginRepoPointer[1],
        build: pluginRepoPointer[2],
      },
    },
    helpersHash: hashHelpers(helpers),
    initData: initData,
  };
}

export function createPrepareUninstallationParams(
  plugin: string,
  pluginRepoPointer: PluginRepoPointer,
  helpers: string[],
  data: BytesLike
) {
  return {
    pluginSetupRef: {
      pluginSetupRepo: pluginRepoPointer[0],
      versionTag: {
        release: pluginRepoPointer[1],
        build: pluginRepoPointer[2],
      },
    },
    setupPayload: {
      plugin: plugin,
      currentHelpers: helpers,
      data: data,
    },
  };
}

export function createApplyUninstallationParams(
  plugin: string,
  pluginRepoPointer: PluginRepoPointer,
  permissions: PermissionOperation[]
) {
  return {
    plugin: plugin,
    pluginSetupRef: {
      pluginSetupRepo: pluginRepoPointer[0],
      versionTag: {
        release: pluginRepoPointer[1],
        build: pluginRepoPointer[2],
      },
    },
    permissions: permissions,
  };
}
