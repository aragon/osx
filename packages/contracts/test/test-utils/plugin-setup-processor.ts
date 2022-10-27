import {ethers} from 'hardhat';
import {findEvent} from './event';
import {PluginSetupProcessor, PluginRepoRegistry} from '../../typechain';
import {BigNumber, utils} from 'ethers';

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
  permissionId: utils.BytesLike;
};

export async function prepareInstallation(
  pluginSetupProcessorContract: PluginSetupProcessor,
  daoAddress: string,
  pluginSetup: string,
  pluginRepo: string,
  data: string
): Promise<{
  plugin: string;
  helpers: string[];
  permissions: PermissionOperation[];
}> {
  const tx = await pluginSetupProcessorContract.prepareInstallation(
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

export function mockPermissions(
  amount: number,
  op: Operation
): PermissionOperation[] {
  let arr: PermissionOperation[] = [];

  for (let i = 0; i < amount; i++) {
    arr.push({
      operation: op,
      where: ethers.utils.hexZeroPad(ethers.utils.hexlify(i), 20),
      who: ethers.utils.hexZeroPad(ethers.utils.hexlify(i), 20),
      oracle: ethers.constants.AddressZero,
      permissionId: ethers.utils.id('MOCK_PERMISSION'),
    });
  }

  return arr;
}
