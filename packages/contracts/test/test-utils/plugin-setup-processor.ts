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

  // TODO:GIORGI test commented
  // const PluginSetupProcessor = new PluginSetupProcessor__factory(
  //   (await ethers.getSigners())[0]
  // );
  // psp = await PluginSetupProcessor.deploy(pluginRepoRegistry.address);

  psp = await hre.wrapper.deploy('PluginSetupProcessor', {
    args: [pluginRepoRegistry.address],
  });

  return psp;
}
