import {ethers} from 'hardhat';

import {
  PluginSetupProcessor__factory,
  PluginRepoRegistry,
  PluginSetupProcessor,
} from '../../typechain';

export async function deployPluginSetupProcessor(
  pluginRepoRegistry: PluginRepoRegistry
): Promise<PluginSetupProcessor> {
  let psp: PluginSetupProcessor;

  const PluginSetupProcessor = new PluginSetupProcessor__factory(
    (await ethers.getSigners())[0]
  );

  psp = await PluginSetupProcessor.deploy(pluginRepoRegistry.address);

  return psp;
}
