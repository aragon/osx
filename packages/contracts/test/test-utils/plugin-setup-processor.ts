import {ethers} from 'hardhat';
import {findEvent} from './event';
import {PluginSetupProcessor, PluginRepoRegistry} from '../../typechain';

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

export async function prepareInstallation(
  pluginSetupProcessorContract: PluginSetupProcessor,
  daoAddress: string,
  pluginSetup: string,
  pluginRepo: string,
  data: string
) {
  const tx = await pluginSetupProcessorContract.prepareInstallation(
    daoAddress,
    pluginSetup,
    pluginRepo,
    data
  );
  const event = await findEvent(tx, 'InstallationPrepared');
  const {plugin, helpers, permissions} = event.args;
  return {
    plugin: plugin,
    helpers: helpers,
    prepareInstallpermissions: permissions,
  };
}

export enum Op {
  Grant,
  Revoke,
  Freeze,
  GrantWithOracle,
}

export function mockPermissions(amount: number, op: Op) {
  let arr = [];

  for (let i = 0; i < amount; i++) {
    arr.push([
      op,
      ethers.utils.hexZeroPad(ethers.utils.hexlify(i), 20),
      ethers.utils.hexZeroPad(ethers.utils.hexlify(i), 20),
      ethers.constants.AddressZero,
      ethers.utils.id('MOCK_PERMISSION'),
    ]);
  }

  return arr;
}
