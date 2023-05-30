import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from '../../helpers';

import pluginRepoFactoryArtifact from '../../../artifacts/src/framework/plugin/repo/PluginRepoFactory.sol/PluginRepoFactory.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  // Get `PluginRepoRegistry` address.
  const pluginRepoRegistryAddress = await getContractAddress(
    'PluginRepoRegistry',
    hre
  );

  await deploy('PluginRepoFactory', {
    contract: pluginRepoFactoryArtifact,
    from: deployer.address,
    args: [pluginRepoRegistryAddress],
    log: true,
  });
};
export default func;
func.tags = ['New', 'PluginRepoFactory'];
