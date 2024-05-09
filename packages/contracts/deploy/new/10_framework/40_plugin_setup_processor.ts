import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress, skipIfZkSync} from '../../helpers';

import pluginSetupProcessorFactoryArtifact from '../../../artifacts/src/framework/plugin/setup/PluginSetupProcessor.sol/PluginSetupProcessor.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  // Get `PluginRepoRegistry` address.
  const pluginRepoRegistryAddress = await getContractAddress(
    'PluginRepoRegistry',
    hre
  );

  await deploy('PluginSetupProcessor', {
    contract: pluginSetupProcessorFactoryArtifact,
    from: deployer.address,
    args: [pluginRepoRegistryAddress],
    log: true,
  });
};
export default func;
func.tags = ['New', 'PluginSetupProcessor'];
func.skip = async hre => await skipIfZkSync(hre, 'PluginSetupProcessor');
