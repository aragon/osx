import {PluginSetupProcessor} from '../../../typechain';
import {
  InstallationAppliedEvent,
  InstallationPreparedEvent,
  UninstallationAppliedEvent,
  UninstallationPreparedEvent,
  UpdateAppliedEvent,
  UpdatePreparedEvent,
} from '../../../typechain/PluginSetupProcessor';
import {
  createApplyInstallationParams,
  createApplyUninstallationParams,
  createApplyUpdateParams,
  createPrepareInstallationParams,
  createPrepareUninstallationParams,
  createPrepareUpdateParams,
} from './create-params';
import {PermissionOperation, PluginRepoPointer} from './types';
import {findEvent} from '@aragon/osx-commons-sdk';
import {BytesLike} from 'ethers';

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

  const eventName = 'InstallationPrepared';
  const event = await findEvent<InstallationPreparedEvent>(tx, eventName);
  if (!event) {
    throw new Error(`Failed to get ${eventName} event`);
  }

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

  const eventName = 'InstallationApplied';
  const event = await findEvent<InstallationAppliedEvent>(tx, eventName);
  if (!event) {
    throw new Error(`Failed to get ${eventName} event`);
  }

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

  const eventName = 'UpdatePrepared';
  const event = await findEvent<UpdatePreparedEvent>(tx, eventName);
  if (!event) {
    throw new Error(`Failed to get ${eventName} event`);
  }

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

  const eventName = 'UpdateApplied';
  const event = await findEvent<UpdateAppliedEvent>(tx, eventName);
  if (!event) {
    throw new Error(`Failed to get ${eventName} event`);
  }

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

  const eventName = 'UninstallationPrepared';
  const event = await findEvent<UninstallationPreparedEvent>(tx, eventName);
  if (!event) {
    throw new Error(`Failed to get ${eventName} event`);
  }

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

  const eventName = 'UninstallationApplied';
  const event = await findEvent<UninstallationAppliedEvent>(tx, eventName);
  if (!event) {
    throw new Error(`Failed to get ${eventName} event`);
  }

  return event.args;
}
