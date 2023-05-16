import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {getContractAddress} from '../../helpers';

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
    from: deployer.address,
    args: [daoRegistryAddress, pluginSetupProcessorAddress],
    log: true,
  });
};
export default func;
func.tags = ['DAOFactory'];
