import {ethers} from 'hardhat';
import {decodeEvent} from './event';
import {AragonPluginRegistry, PluginSetupProcessor} from '../../typechain';

export async function deployPluginSetupProcessor(
  managingDao: any,
  aragonPluginRegistry: AragonPluginRegistry
): Promise<PluginSetupProcessor> {
  let psp: PluginSetupProcessor;

  // PluginSetupProcessor
  const PluginSetupProcessor = await ethers.getContractFactory(
    'PluginSetupProcessor'
  );
  psp = await PluginSetupProcessor.deploy(
    managingDao.address,
    aragonPluginRegistry.address
  );

  return psp;
}

export async function deployAragonPluginRegistry(
  managingDao: any
): Promise<AragonPluginRegistry> {
  let aragonPluginRegistry: AragonPluginRegistry;

  const AragonPluginRegistry = await ethers.getContractFactory(
    'AragonPluginRegistry'
  );
  aragonPluginRegistry = await AragonPluginRegistry.deploy();
  await aragonPluginRegistry.initialize(managingDao.address);

  return aragonPluginRegistry;
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
  const event = await decodeEvent(tx, 'InstallationPrepared');
  const {plugin, helpers, permissions} = event.args;
  return {
    plugin: plugin,
    helpers: helpers,
    prepareInstallpermissions: permissions,
  };
}
