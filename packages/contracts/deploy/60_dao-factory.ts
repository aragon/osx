import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const daoRegistryAddress = await getContractAddress('DAORegistry', hre);
  const tokenFactoryAddress = await getContractAddress('TokenFactory', hre);

  await deploy('DAOFactory', {
    from: deployer,
    args: [daoRegistryAddress, tokenFactoryAddress],
    log: true,
  });
};
export default func;
func.tags = ['DAOFactory'];
