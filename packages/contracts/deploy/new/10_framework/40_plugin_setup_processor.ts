import pluginSetupProcessorFactoryArtifact from '../../../artifacts/src/framework/plugin/setup/PluginSetupProcessor.sol/PluginSetupProcessor.json';
import {getContractAddress} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  // Get `PluginRepoRegistry` address.
  const pluginRepoRegistryAddress = await getContractAddress(
    'PluginRepoRegistryProxy',
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
