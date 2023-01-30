import {hashHelpers, hashPermissions} from './hash-helpers';
import {PermissionOperation, PluginRepoPointer} from './types';
import {BytesLike, utils, constants} from 'ethers';

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
    }
  };
}

export function createApplyUninstallParams(
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
