import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  let erc20VotingFactoryAddress: string = '';
  let whiteListFactoryAddress: string = '';
  while (!erc20VotingFactoryAddress && !whiteListFactoryAddress) {
    try {
      erc20VotingFactoryAddress = await getContractAddress(
        'ERC20VotingFactory',
        hre
      );
      whiteListFactoryAddress = await getContractAddress(
        'WhiteListFactory',
        hre
      );
    } catch (e) {
      console.log(
        'no WhiteListFactory, or ERC20VotingFactory address found...'
      );
      throw e;
    }
  }

  await deploy('APMRegistry', {
    from: deployer,
    log: true,
  });
};
export default func;
func.runAtTheEnd = true;
func.tags = ['APMRegistry'];
