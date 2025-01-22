import {
  PluginSetupProcessor__factory,
  PluginRepoRegistry,
  PluginSetupProcessor,
} from '../../typechain';
import hre, {ethers} from 'hardhat';

export async function deployPluginSetupProcessor(
  pluginRepoRegistry: PluginRepoRegistry
): Promise<PluginSetupProcessor> {
  const psp = await hre.wrapper.deploy('PluginSetupProcessor', {
    args: [pluginRepoRegistry.address],
  });

  return psp;
}
