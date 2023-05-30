import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from '../../helpers';

import daoFactoryArtifact from '../../../artifacts/src/framework/dao/DAOFactory.sol/DAOFactory.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  // Get `DAORegistry` address.
  const daoRegistryAddress = await getContractAddress('DAORegistry', hre);

  // Get `PluginSetupProcessor` address.
  const pluginSetupProcessorAddress = await getContractAddress(
    'PluginSetupProcessor',
    hre
  );

  await deploy('DAOFactory', {
    contract: daoFactoryArtifact,
    from: deployer.address,
    args: [daoRegistryAddress, pluginSetupProcessorAddress],
    log: true,
  });
};
export default func;
func.tags = ['New', 'DAOFactory'];
