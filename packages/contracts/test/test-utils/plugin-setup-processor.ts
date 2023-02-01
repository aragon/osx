import {ethers} from 'hardhat';
import {findEvent} from '../../utils/event';
import {getMergedABI} from '../../utils/abi';
import {
  DAO,
  PluginSetupProcessor,
  PluginRepoRegistry,
  PluginUUPSUpgradeableSetupV1Mock,
  PluginUUPSUpgradeableSetupV1MockBad,
  PluginUUPSUpgradeableSetupV2Mock,
  PluginUUPSUpgradeableSetupV3Mock,
  PluginUUPSUpgradeableSetupV4Mock,
  PluginCloneableSetupV1Mock,
  PluginCloneableSetupV2Mock,
} from '../../typechain';

// TODO: put in common or something.
const EMPTY_DATA = '0x';

import {BytesLike, utils, constants} from 'ethers';
import {Operation} from '../core/permission/permission-manager';
import {PermissionOperation, PluginRepoPointer} from './psp/types';
import {
  InstallationAppliedEvent,
  InstallationPreparedEvent,
  UninstallationAppliedEvent,
  UninstallationPreparedEvent,
} from '../../typechain/PluginSetupProcessor';
import {
  createPrepareInstallationParams,
  createApplyInstallationParams,
  createPrepareUninstallationParams,
  createApplyUninstallParams,
} from './psp/create-params';

export async function deployPluginSetupProcessor(
  managingDao: any,
  pluginRepoRegistry: PluginRepoRegistry
): Promise<PluginSetupProcessor> {
  let psp: PluginSetupProcessor;

  const {abi, bytecode} = await getMergedABI(
    // @ts-ignore
    hre,
    'PluginSetupProcessor',
    ['ERC1967Upgrade']
  );

  const PluginSetupProcessor = new ethers.ContractFactory(
    abi,
    bytecode,
    (await ethers.getSigners())[0]
  );

  psp = (await PluginSetupProcessor.deploy(
    managingDao.address,
    pluginRepoRegistry.address
  )) as PluginSetupProcessor;

  return psp;
}

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
  const event = await findEvent(tx, 'InstallationPrepared');
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

  const event = await findEvent(tx, 'InstallationApplied');
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
    createPrepareUninstallationParams(
      plugin,
      pluginRepoPointer,
      helpers,
      data
    )
  );

  const event = await findEvent(tx, 'UninstallationPrepared');
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
    createApplyUninstallParams(plugin, pluginRepoPointer, permissions)
  );

  const event = await findEvent(tx, 'UninstallationApplied');
  return event.args;
}

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
    preparedSetupId: preparedSetupId
  } = await prepareInstallation(
    psp,
    targetDao,
    pluginRepoPointer,
    data
  ));

  const {appliedSetupId: appliedSetupId } = await applyInstallation(
    psp,
    targetDao,
    plugin,
    pluginRepoPointer,
    permissions,
    helpers
  );

  return {plugin, helpers, permissions, appliedSetupId, preparedSetupId};
}

export async function uninstallPlugin(
  psp: PluginSetupProcessor,
  targetDao: string,
  plugin: string,
  helpers: string[],
  pluginRepoPointer: PluginRepoPointer,
  data: BytesLike = EMPTY_DATA
) {
  
  const { permissions } = await prepareUninstallation(
    psp,
    targetDao,
    plugin,
    pluginRepoPointer,
    helpers,
    data
  )

  await applyUninstallation(
    psp,
    targetDao,
    plugin,
    pluginRepoPointer,
    permissions
  )
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
) {
  let arr = [];

  for (let i = start; i < end; i++) {
    arr.push({
      operation: op,
      where: utils.hexZeroPad(ethers.utils.hexlify(i), 20),
      who: utils.hexZeroPad(ethers.utils.hexlify(i), 20),
      condition: constants.AddressZero,
      permissionId: utils.id('MOCK_PERMISSION'),
    });
  }

  return arr.map(item => Object.values(item));
}

export function mockHelpers(amount: number): string[] {
  let arr: string[] = [];

  for (let i = 0; i < amount; i++) {
    arr.push(utils.hexZeroPad(ethers.utils.hexlify(i), 20));
  }

  return arr;
}
