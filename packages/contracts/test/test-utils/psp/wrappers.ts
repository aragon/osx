import {BytesLike} from 'ethers';
import {PluginSetupProcessor} from '../../../typechain';
import {
  InstallationAppliedEvent,
  InstallationPreparedEvent,
  UninstallationAppliedEvent,
  UninstallationPreparedEvent,
  UpdateAppliedEvent,
  UpdatePreparedEvent,
} from '../../../typechain/PluginSetupProcessor';
import {findEvent} from '../../../utils/event';
import {
  createApplyInstallationParams,
  createApplyUninstallationParams,
  createApplyUpdateParams,
  createPrepareInstallationParams,
  createPrepareUninstallationParams,
  createPrepareUpdateParams,
} from './create-params';
import {PermissionOperation, PluginRepoPointer} from './types';

export async function prepareInstallation(
  psp: PluginSetupProcessor,
  daoAddress: string,
  pluginRepoPointer: PluginRepoPointer,
  data: BytesLike
): Promise<InstallationPreparedEvent['args']> {
  const tx = await psp.prepareInstallation(
    daoAddress,
    createPrepareInstallationParams(pluginRepoPointer, data)
  );
  const event = await findEvent<InstallationPreparedEvent>(
    tx,
    'InstallationPrepared'
  );
  return event.args;
}

export async function applyInstallation(
  psp: PluginSetupProcessor,
  daoAddress: string,
  plugin: string,
  pluginRepoPointer: PluginRepoPointer,
  permissions: PermissionOperation[],
  helpers: string[]
): Promise<InstallationAppliedEvent['args']> {
  const tx = await psp.applyInstallation(
    daoAddress,
    createApplyInstallationParams(
      plugin,
      pluginRepoPointer,
      permissions,
      helpers
    )
  );

  const event = await findEvent<InstallationAppliedEvent>(
    tx,
    'InstallationApplied'
  );
  return event.args;
}

export async function prepareUpdate(
  psp: PluginSetupProcessor,
  daoAddress: string,
  plugin: string,
  currentVersionTag: [number, number],
  newVersionTag: [number, number],
  pluginSetupRepo: string,
  helpers: string[],
  data: BytesLike
): Promise<UpdatePreparedEvent['args']> {
  const tx = await psp.prepareUpdate(
    daoAddress,
    createPrepareUpdateParams(
      plugin,
      currentVersionTag,
      newVersionTag,
      pluginSetupRepo,
      helpers,
      data
    )
  );

  const event = await findEvent<UpdatePreparedEvent>(tx, 'UpdatePrepared');
  return event.args;
}

export async function applyUpdate(
  psp: PluginSetupProcessor,
  daoAddress: string,
  plugin: string,
  pluginRepoPointer: PluginRepoPointer,
  initData: BytesLike,
  permissions: PermissionOperation[],
  helpers: string[]
): Promise<UpdateAppliedEvent['args']> {
  const tx = await psp.applyUpdate(
    daoAddress,
    createApplyUpdateParams(
      plugin,
      pluginRepoPointer,
      initData,
      permissions,
      helpers
    )
  );

  const event = await findEvent<UpdateAppliedEvent>(tx, 'UpdateApplied');
  return event.args;
}

export async function prepareUninstallation(
  psp: PluginSetupProcessor,
  daoAddress: string,
  plugin: string,
  pluginRepoPointer: PluginRepoPointer,
  helpers: string[],
  data: BytesLike
): Promise<UninstallationPreparedEvent['args']> {
  const tx = await psp.prepareUninstallation(
    daoAddress,
    createPrepareUninstallationParams(plugin, pluginRepoPointer, helpers, data)
  );

  const event = await findEvent<UninstallationPreparedEvent>(
    tx,
    'UninstallationPrepared'
  );
  return event.args;
}

export async function applyUninstallation(
  psp: PluginSetupProcessor,
  daoAddress: string,
  plugin: string,
  pluginRepoPointer: PluginRepoPointer,
  permissions: PermissionOperation[]
): Promise<UninstallationAppliedEvent['args']> {
  const tx = await psp.applyUninstallation(
    daoAddress,
    createApplyUninstallationParams(plugin, pluginRepoPointer, permissions)
  );

  const event = await findEvent<UninstallationAppliedEvent>(
    tx,
    'UninstallationApplied'
  );
  return event.args;
}
