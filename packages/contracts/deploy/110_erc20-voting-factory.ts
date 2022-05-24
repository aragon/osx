import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const tokenFactoryAddress = await getContractAddress('TokenFactory', hre);

  await deploy('ERC20VotingFactory', {
    from: deployer,
    args: [tokenFactoryAddress],
    log: true,
  });
};
export default func;
func.runAtTheEnd = true;
func.tags = ['ERC20VotingFactory'];
