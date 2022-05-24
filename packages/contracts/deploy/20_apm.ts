import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const adminDaoAddress = await getContractAddress('DAO', hre);

  const ret = await deploy('APMRegistry', {
    from: deployer,
    log: true,
  });

  const ampAddress: string = ret.receipt?.contractAddress || '';

  if (ampAddress !== '') {
    const APMRegistryContract = await ethers.getContractAt(
      'APMRegistry',
      ampAddress
    );
    await APMRegistryContract.initialize(
      adminDaoAddress,
      '0x0000000000000000000000000000000000000000'
    );
    console.log('=== APMRegistryContract initialized', ampAddress);
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['APMRegistry'];
