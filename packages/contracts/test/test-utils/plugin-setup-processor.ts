import hre, {ethers} from 'hardhat';

import {
  PluginSetupProcessor__factory,
  PluginRepoRegistry,
  PluginSetupProcessor,
} from '../../typechain';

export async function deployPluginSetupProcessor(
  pluginRepoRegistry: PluginRepoRegistry
): Promise<PluginSetupProcessor> {
  let psp: PluginSetupProcessor;

  psp = await hre.wrapper.deploy('PluginSetupProcessor', {
    args: [pluginRepoRegistry.address],
  });

  return psp;
}
