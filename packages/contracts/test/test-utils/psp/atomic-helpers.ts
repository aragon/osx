import {BytesLike} from 'ethers';
import {DAO, PluginSetupProcessor} from '../../../typechain';
import {PermissionOperation, PluginRepoPointer, VersionTag} from './types';
import {
  applyInstallation,
  applyUninstallation,
  applyUpdate,
  prepareInstallation,
  prepareUninstallation,
  prepareUpdate,
} from './wrappers';

const EMPTY_DATA = '0x';

// Requires a caller to have apply install permission on psp.
export async function installPlugin(
  psp: PluginSetupProcessor,
  targetDao: string,
  pluginRepoPointer: PluginRepoPointer,
  data: BytesLike = EMPTY_DATA
): Promise<{
  plugin: string;
  helpers: string[];
  permissions: PermissionOperation[];
  preparedSetupId: string;
  appliedSetupId: string;
}> {
  let plugin: string;
  let helpers: string[];
  let permissions: PermissionOperation[];
  let preparedSetupId: string;
  ({
    plugin: plugin,
    preparedSetupData: {helpers, permissions},
    preparedSetupId: preparedSetupId,
  } = await prepareInstallation(psp, targetDao, pluginRepoPointer, data));

  const {appliedSetupId: appliedSetupId} = await applyInstallation(
    psp,
    targetDao,
    plugin,
    pluginRepoPointer,
    permissions,
    helpers
  );

  return {plugin, helpers, permissions, appliedSetupId, preparedSetupId};
}

// Requires a caller to have apply uninstall permission on psp.
export async function uninstallPlugin(
  psp: PluginSetupProcessor,
  targetDao: string,
  plugin: string,
  helpers: string[],
  pluginRepoPointer: PluginRepoPointer,
  data: BytesLike = EMPTY_DATA
) {
  const {permissions} = await prepareUninstallation(
    psp,
    targetDao,
    plugin,
    pluginRepoPointer,
    helpers,
    data
  );

  await applyUninstallation(
    psp,
    targetDao,
    plugin,
    pluginRepoPointer,
    permissions
  );
}

export async function updatePlugin(
  psp: PluginSetupProcessor,
  targetDao: string,
  proxy: string,
  currentVersion: VersionTag,
  newVersion: VersionTag,
  pluginSetupRepo: string,
  currentHelpers: string[],
  data: BytesLike
) {
  const {
    preparedSetupData: {permissions, helpers: updatedHelpers},
    initData,
  } = await prepareUpdate(
    psp,
    targetDao,
    proxy,
    currentVersion,
    newVersion,
    pluginSetupRepo,
    currentHelpers,
    data
  );

  await applyUpdate(
    psp,
    targetDao,
    proxy,
    [pluginSetupRepo, ...newVersion],
    initData,
    permissions,
    updatedHelpers
  );

  return {initData, updatedHelpers, permissions};
}
