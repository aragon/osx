import {ethers} from 'hardhat';
import {findEvent} from '../../utils/event';
import {PluginSetupProcessor, PluginRepoRegistry} from '../../typechain';
import {BytesLike, utils, constants} from 'ethers';

export async function deployPluginSetupProcessor(
  managingDao: any,
  pluginRepoRegistry: PluginRepoRegistry
): Promise<PluginSetupProcessor> {
  let psp: PluginSetupProcessor;

  // PluginSetupProcessor
  const PluginSetupProcessor = await ethers.getContractFactory(
    'PluginSetupProcessor'
  );
  psp = await PluginSetupProcessor.deploy(
    managingDao.address,
    pluginRepoRegistry.address
  );

  return psp;
}

export enum Operation {
  Grant,
  Revoke,
  Freeze,
  GrantWithOracle,
}

export type PermissionOperation = {
  operation: Operation;
  where: string;
  who: string;
  oracle: string;
  permissionId: BytesLike;
};

export async function prepareInstallation(
  psp: PluginSetupProcessor,
  daoAddress: string,
  pluginSetup: string,
  pluginRepo: string,
  data: BytesLike
): Promise<{
  plugin: string;
  helpers: string[];
  permissions: PermissionOperation[];
}> {
  const tx = await psp.prepareInstallation(
    daoAddress,
    pluginSetup,
    pluginRepo,
    data
  );
  const event = await findEvent(tx, 'InstallationPrepared');
  let {plugin, helpers, permissions} = event.args;
  return {
    plugin: plugin,
    helpers: helpers,
    permissions: permissions,
  };
}

export async function prepareUninstallation(
  psp: PluginSetupProcessor,
  daoAddress: string,
  plugin: string,
  pluginSetup: string,
  pluginRepo: string,
  currentHelpers: string[],
  data: BytesLike
): Promise<{
  returnedPluginAddress: string;
  returnedHelpers: string[];
  permissions: PermissionOperation[];
}> {
  const tx = await psp.prepareUninstallation(
    daoAddress,
    plugin,
    pluginSetup,
    pluginRepo,
    currentHelpers,
    data
  );
  const event = await findEvent(tx, 'UninstallationPrepared');
  let {
    plugin: returnedPluginAddress,
    currentHelpers: returnedHelpers,
    permissions,
  } = event.args;

  return {
    returnedPluginAddress: returnedPluginAddress,
    returnedHelpers: returnedHelpers,
    permissions: permissions,
  };
}

export async function prepareUpdate(
  psp: PluginSetupProcessor,
  daoAddress: string,
  plugin: string,
  currentPluginSetup: string,
  newPluginSetup: string,
  pluginRepo: string,
  currentHelpers: string[],
  data: BytesLike
): Promise<{
  returnedPluginAddress: string;
  updatedHelpers: string[];
  permissions: PermissionOperation[];
  initData: BytesLike;
}> {
  const pluginUpdateParams = {
    plugin: plugin,
    pluginSetupRepo: pluginRepo,
    currentPluginSetup: currentPluginSetup,
    newPluginSetup: newPluginSetup,
  };

  const tx = await psp.prepareUpdate(
    daoAddress,
    pluginUpdateParams,
    currentHelpers,
    data
  );

  const event = await findEvent(tx, 'UpdatePrepared');
  let {
    plugin: returnedPluginAddress,
    updatedHelpers,
    permissions,
    initData,
  } = event.args;

  return {
    returnedPluginAddress: returnedPluginAddress,
    updatedHelpers: updatedHelpers,
    permissions: permissions,
    initData: initData,
  };
}

export function mockPermissionsOperations(
  start: number,
  end: number,
  op: Operation
): PermissionOperation[] {
  let arr: PermissionOperation[] = [];

  for (let i = start; i < end; i++) {
    arr.push({
      operation: op,
      where: utils.hexZeroPad(ethers.utils.hexlify(i), 20),
      who: utils.hexZeroPad(ethers.utils.hexlify(i), 20),
      oracle: constants.AddressZero,
      permissionId: utils.id('MOCK_PERMISSION'),
    });
  }

  return arr;
}

export function mockHelpers(amount: number): string[] {
  let arr: string[] = [];

  for (let i = 0; i < amount; i++) {
    arr.push(utils.hexZeroPad(ethers.utils.hexlify(i), 20));
  }

  return arr;
}
