import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const aragonPluginRegistryAddress = await getContractAddress(
    'AragonPluginRegistry',
    hre
  );

  await deploy('PluginRepoFactory', {
    from: deployer,
    args: [aragonPluginRegistryAddress],
    log: true,
  });
};
export default func;
func.tags = ['AragonPluginRegistry'];
