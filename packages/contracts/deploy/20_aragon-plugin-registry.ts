import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const adminDaoAddress = await getContractAddress('DAO', hre);

  const ret = await deploy('AragonPluginRegistry', {
    from: deployer,
    log: true,
  });

  const ampAddress: string = ret.receipt?.contractAddress || '';

  if (ampAddress !== '') {
    const AragonPluginRegistryContract = await ethers.getContractAt(
      'AragonPluginRegistry',
      ampAddress
    );
    await AragonPluginRegistryContract.initialize(adminDaoAddress);
    console.log('AragonPluginRegistryContract initialized', ampAddress);
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['AragonPluginRegistry'];
