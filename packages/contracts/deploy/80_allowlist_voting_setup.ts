import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy('AllowlistVotingSetup', {
    from: deployer,
    args: [],
    log: true,
  });
};
export default func;
func.tags = ['AllowlistVotingSetup'];
