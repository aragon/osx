import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {getContractAddress} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  // Get `DAORegistry` address.
  const daoRegistryAddress = await getContractAddress('DAORegistry', hre);

  // Get `PluginSetupProcessor` address.
  const pluginSetupProcessorAddress = await getContractAddress(
    'PluginSetupProcessor',
    hre
  );

  await deploy('DAOFactory', {
    from: deployer,
    args: [daoRegistryAddress, pluginSetupProcessorAddress],
    log: true,
  });
};
export default func;
func.tags = ['DAOFactory'];
