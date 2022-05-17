import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  let erc20VotingFactoryAddress: string = '';
  let whiteListFactoryAddress: string = '';
  let adminDaoAddress: string = '';
  while (
    !erc20VotingFactoryAddress &&
    !whiteListFactoryAddress &&
    !adminDaoAddress
  ) {
    try {
      erc20VotingFactoryAddress = await getContractAddress(
        'ERC20VotingFactory',
        hre
      );
      whiteListFactoryAddress = await getContractAddress(
        'WhiteListFactory',
        hre
      );
      adminDaoAddress = await getContractAddress('DAO', hre);
    } catch (e) {
      console.log(
        'no WhiteListFactory, or ERC20VotingFactory address found...'
      );
      throw e;
    }
  }

  const ret = await deploy('APMRegistry', {
    from: deployer,
    log: true,
  });

  const ampAddress: string = ret.receipt?.contractAddress || '';

  if (ampAddress !== '') {
    console.log('APM deploy result', ampAddress);
    const APMRegistryContract = await ethers.getContractAt(
      'APMRegistry',
      ampAddress
    );
    await APMRegistryContract.initialize(
      adminDaoAddress,
      '0x0000000000000000000000000000000000000000'
    );
    console.log('APMRegistryContract initialized');
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['APMRegistry'];
