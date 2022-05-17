import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  let adminDaoAddress: string = '';
  while (!adminDaoAddress) {
    try {
      adminDaoAddress = await getContractAddress('DAO', hre);
    } catch (e) {
      console.log('no Registry address found...');
      throw e;
    }
  }

  await deploy('Registry', {
    from: deployer,
    /* args: [
      pass adminDaoAddress
    ],*/
    log: true,
  });
};
export default func;
func.tags = ['Registry'];
